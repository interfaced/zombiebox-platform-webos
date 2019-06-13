/*
 * This file is part of the ZombieBox package.
 *
 * Copyright (c) 2014-2019, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

const crypto = require('crypto');
const fse = require('fs-extra');
const imageSize = require('image-size');
const path = require('path');
const {spawn} = require('child_process');
const {AbstractPlatform, utils: {mergeConfigs}} = require('zombiebox');
const buildCLI = require('./cli/webos.js');


/**
 */
class PlatformWebOS extends AbstractPlatform {
	/**
	 * @override
	 */
	getName() {
		return 'webos';
	}

	/**
	 * @override
	 */
	getSourcesDir() {
		return path.join(__dirname, 'lib');
	}

	/**
	 * @override
	 */
	getConfig() {
		return {
			platforms: {
				webos: {
					toolsDir: null
				}
			}
		};
	}

	/**
	 * @override
	 */
	buildCLI(yargs, application) {
		return buildCLI(yargs, application, getToolsDir(application.getConfig()));
	}

	/**
	 * @override
	 */
	async buildApp(app, distDir) {
		const getAresPackageBinPath = (toolsDir) => path.join(toolsDir, 'ares-package');

		/**
		 * @type {Array<string>}
		 */
		const warnings = [];
		const buildHelper = app.getBuildHelper();
		const config = app.getConfig();
		const {name, version} = app.getAppPackageJson();
		const toolsDir = getToolsDir(config);
		/**
		 * @type {PlatformWebOS.Config}
		 */
		const originalUserConfig = config.platforms.webos;

		warnings.push(
			await buildHelper.writeIndexHTML(path.join(distDir, 'index.html'))
		);

		const defaultAppInfo = this._createDefaultAppInfo(name, version);

		const userImgConfig = await this._createUserImgConfig(originalUserConfig.img);
		const {images, warnings: imagesCheckWarnings} = await this._checkAndFilterImages(userImgConfig);
		warnings.push(imagesCheckWarnings.join('\n'));

		const defaultImgConfig = this._generateDefaultImageFullPathObject(__dirname);
		const resultImgConfig = mergeConfigs(defaultImgConfig, images);
		await this._copyImages(distDir, resultImgConfig);

		const userAppInfo = originalUserConfig.appinfo;
		const appInfo = userAppInfo ? mergeConfigs(defaultAppInfo, userAppInfo) : defaultAppInfo;
		const resultAppInfo = mergeConfigs(
			appInfo,
			PlatformWebOS.ImageDistPath
		);

		buildHelper.copyStaticFiles(distDir);

		await fse.writeJson(path.join(distDir, 'appinfo.json'), resultAppInfo);

		await this._buildIpkPackage(getAresPackageBinPath(toolsDir), distDir);

		return warnings.filter(Boolean).join('\n');
	}

	/**
	 * @param {string} aresPackageBin
	 * @param {string} distDir
	 * @return {Promise}
	 * @protected
	 */
	_buildIpkPackage(aresPackageBin, distDir) {
		const packageBuild = spawn(aresPackageBin, [distDir, '-o', distDir], {
			stdio: [process.stdin, process.stdout, process.stderr]
		});

		return new Promise((resolve, reject) => {
			packageBuild.on('close', (code, signal) => {
				if (code !== 0) {
					console.error(`${aresPackageBin} process terminated due to receipt of signal ${signal}`);
					reject();
				} else {
					console.log(`The ipk package was built into ${distDir}`);
					resolve();
				}
			});
		});
	}

	/**
	 * @param {(string|Object)=} userImgConfig
	 * @return {Promise<Object<string, string>>}
	 * @protected
	 */
	_createUserImgConfig(userImgConfig) {
		return Promise.resolve(
			typeof userImgConfig === 'object' ?
				userImgConfig :
				typeof userImgConfig === 'string' ?
					fse.readdir(userImgConfig)
						.then((filenames) => {
							const fullPaths = filenames.map((name) => path.resolve(userImgConfig, name));

							return this._convertPathsToDistPathsByImageName(fullPaths);
						}) :
					{}
		);
	}

	/**
	 * @param {string} name
	 * @param {string} version
	 * @return {Object}
	 * @protected
	 */
	_createDefaultAppInfo(name, version) {
		return {
			'id': `com.zombiebox.${name}-${this._generateRandomString()}`,
			'title': name,
			'version': version,
			'vendor': 'Interfaced',
			'type': 'web',
			'disableBackHistoryAPI': true,
			'iconColor': '#3c3c3c',
			'main': 'index.html'
		};
	}

	/**
	 * @param {Object<string, string>} files
	 * @return {{
	 *     images: Object<PlatformWebOS.ImageName, string>,
	 *     warnings: Array<string>
	 * }}
	 * @protected
	 */
	async _checkAndFilterImages(files) {
		/**
		 * @param {boolean} condition
		 * @param {function(): string} getRejectMessage
		 * @return {Promise}
		 */
		const promisifyBoolean = (condition, getRejectMessage) => condition ?
			Promise.resolve() :
			Promise.reject(getRejectMessage());

		/**
		 * @param {Array<function(): Promise>} checks
		 * @return {Promise}
		 */
		const check = (checks) => {
			const run = (queue) =>
				queue.shift()()
					.then(() => queue.length && run(queue) || undefined);

			return run([...checks]);
		};

		const createImageChecks = (imageName, imagePath) => {
			const basename = path.basename(imagePath);
			const extension = path.extname(basename.toLowerCase());
			const requiredSize = PlatformWebOS.ImageSize[imageName];

			return [
				() => promisifyBoolean(!!requiredSize, () => `Unknown image "${imageName}"`),
				() => promisifyBoolean(extension === '.png', () => `${imageName} is not a png file`),
				() => fse.exists(imagePath)
					.then((exists) =>
						exists ?
							Promise.resolve() :
							Promise.reject(`Could not find "${imageName}" by path ${imagePath}`)
					),
				() => new Promise((resolve, reject) => {
					try {
						const {width, height} = imageSize(imagePath);
						const [requiredWidth, requiredHeight] = requiredSize;

						if (width !== requiredWidth || height !== requiredHeight) {
							reject(
								`Incorrect size of ${basename}: ` +
								`expected ${requiredWidth}x${requiredHeight}, ` +
								`got ${width}x${height}`
							);
						}
					} catch (e) {
						reject(`Failed to read size of ${basename}: ${e.message}`);
					}

					resolve();
				})
			];
		};

		return Object.entries(files)
			.reduce(async (accumulatorPromise, [imageName, imagePath]) => {
				const accumulator = await accumulatorPromise;

				try {
					await check(createImageChecks(imageName, imagePath));

					accumulator.images[imageName] = imagePath;
				} catch (warning) {
					accumulator.warnings.push(warning);
				}

				return Promise.resolve(accumulator);
			}, Promise.resolve({
				images: {},
				warnings: []
			}));
	}

	/**
	 * @return {string}
	 * @protected
	 */
	_generateRandomString() {
		return crypto.randomBytes(3).toString('hex');
	}

	/**
	 * @param {Array<string>} paths
	 * @return {Object<PlatformWebOS.ImageName, string>}
	 * @protected
	 */
	_convertPathsToDistPathsByImageName(paths) {
		return Object.entries(PlatformWebOS.ImageDistPath)
			.reduce((accumulator, [imageName, filename]) => {
				const imagePath = paths.find((imagePath) => imagePath.includes(filename));

				if (imagePath) {
					accumulator[imageName] = imagePath;
				}

				return accumulator;
			}, {});
	}

	/**
	 * @param {string} distDir
	 * @param {Object<PlatformWebOS.ImageName, string>} files
	 * @return {Promise}
	 * @protected
	 */
	async _copyImages(distDir, files) {
		const imagesDist = path.join(distDir, 'img');

		await fse.ensureDir(imagesDist);

		const copyPromises = Object.values(files)
			.map((sourcePath) => {
				const destinationPath = path.join(imagesDist, path.basename(sourcePath));

				return fse.copy(sourcePath, destinationPath);
			});

		return Promise.all(copyPromises);
	}

	/**
	 * @param {string} basePath
	 * @return {Object<PlatformWebOS.ImageName, string>}
	 * @protected
	 */
	_generateDefaultImageFullPathObject(basePath) {
		return Object.entries(PlatformWebOS.ImageDistPath)
			.reduce((accumulator, [imageName, imagePath]) => {
				accumulator[imageName] = path.join(basePath, imagePath);

				return accumulator;
			}, {});
	}
}


/**
 * @param {Config} config
 * @return {string}
 */
function getToolsDir(config) {
	const toolsDir = config.platforms.webos.toolsDir || process.env.WEBOS_CLI_TV;

	if (!toolsDir) {
		throw new Error('Cannot get cli tools directory path. Check README for possible solution');
	}

	return toolsDir;
}


/**
 * @see http://webosose.org/develop/configuration-files/appinfo-json/
 * @typedef {{
 *     id: (string|undefined),
 *     title: (string|undefined),
 *     main: (string|undefined),
 *     icon: (string|undefined),
 *     largeIcon: (string|undefined),
 *     type: (string|undefined),
 *     vendor: (string|undefined),
 *     version: (string|undefined),
 *     appDescription: (string|undefined),
 *     resolution: (string|undefined),
 *     iconColor: (string|undefined),
 *     splashBackground: (string|undefined),
 *     transparent: (boolean|undefined),
 *     requiredMemory: (number|undefined)
 * }}
 */
PlatformWebOS.AppInfo;

/**
 * @typedef {{
 *     img: Object<PlatformWebOS.ImageName, string>,
 *     appinfo: AppInfo
 * }}
 */
PlatformWebOS.Config;

/**
 * @enum {string}
 */
PlatformWebOS.ImageName = {
	ICON: 'icon',
	LARGE_ICON: 'largeIcon',
	BACKGROUND_IMAGE: 'bgImage',
	SPLASH_SCREEN_BACKGROUND: 'splashBackground'
};


/**
 * @type {Object<PlatformWebOS.ImageName, Array<number>>}
 */
PlatformWebOS.ImageSize = {
	[PlatformWebOS.ImageName.ICON]: [80, 80],
	[PlatformWebOS.ImageName.LARGE_ICON]: [130, 130],
	[PlatformWebOS.ImageName.BACKGROUND_IMAGE]: [1920, 1080],
	[PlatformWebOS.ImageName.SPLASH_SCREEN_BACKGROUND]: [1920, 1080]
};


/**
 * @type {Object<PlatformWebOS.ImageName, string>}
 */
PlatformWebOS.ImageDefaultFilename = {
	[PlatformWebOS.ImageName.ICON]: 'icon.png',
	[PlatformWebOS.ImageName.LARGE_ICON]: 'large-icon.png',
	[PlatformWebOS.ImageName.BACKGROUND_IMAGE]: 'bg-image.png',
	[PlatformWebOS.ImageName.SPLASH_SCREEN_BACKGROUND]: 'splash-background.png'
};


/**
 * @type {Object<PlatformWebOS.ImageName, string>}
 */
PlatformWebOS.ImageDistPath = {
	[PlatformWebOS.ImageName.ICON]: 'img/icon.png',
	[PlatformWebOS.ImageName.LARGE_ICON]: 'img/large-icon.png',
	[PlatformWebOS.ImageName.BACKGROUND_IMAGE]: 'img/bg-image.png',
	[PlatformWebOS.ImageName.SPLASH_SCREEN_BACKGROUND]: 'img/splash-background.png'
};

/**
 * @type {PlatformWebOS}
 */
module.exports = PlatformWebOS;
