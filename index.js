/*
 * This file is part of the ZombieBox package.
 *
 * Copyright © 2014-2020, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

const crypto = require('crypto');
const fse = require('fs-extra');
const imageSize = require('image-size');
const path = require('path');
const inquirer = require('inquirer');
const {AbstractPlatform, utils: {mergeConfigs}, logger: zbLogger} = require('zombiebox');
const {
	getInstalledApps,
	build,
	install,
	launch,
	inspect,
	uninstall
} = require('./cli/ares');

const logger = zbLogger.createChild('webOS');


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
			},

			include: [
				{
					name: 'webOS PalmSystem',
					externs: [
						path.resolve(__dirname, 'externs', 'palmsystem.js'),
						path.resolve(__dirname, 'externs', 'palmservicebridge.js')
					]
				}
			]
		};
	}

	/**
	 * @override
	 */
	buildCLI(yargs, app) {
		const config = app.getConfig();
		const distPath = app.getPathHelper().getDistDir({
			baseDir: config.project.dist,
			version: app.getAppVersion(),
			platformName: 'webos'
		});
		const toolsDir = config.platforms.webos.toolsDir;

		/**
		 * @param {string} toolsDir
		 * @param {string} deviceName
		 * @return {Promise<string>}
		 */
		const selectAppFromDevice = async (toolsDir, deviceName) => {
			const installedApps = await getInstalledApps(toolsDir, deviceName);

			logger.silly(`Installed apps: ${installedApps.join(', ')}`);

			if (!installedApps.length) {
				throw new Error('No apps installed on device');
			}

			const {appId} = await inquirer.prompt({
				type: 'list',
				name: 'appId',
				message: 'Select which application to run (sorted from newest to oldest)',
				choices: installedApps.reverse()
			});

			return appId;
		};

		/**
		 * @param {Yargs} yargs
		 * @return {Yargs}
		 */
		const demandAppId = (yargs) =>
			yargs
				.positional(
					'appId',
					{
						describe: 'Application ID to use, if not provided will be detected',
						alias: 'app-id',
						type: 'string'
					}
				)
				.middleware(
					async (argv) => {
						if (!argv.appId) {
							logger.info('Application identifier was not provided.');

							try {
								argv.appId = await this._findAppId(distPath);

								logger.info(`Using application ID ${argv.appId} from local build folder`);
							} catch (e) {
								logger.error(`Could not extract application ID from local build: ${e.message}`);

								argv.appId = await selectAppFromDevice(toolsDir, argv.device);
							}
						}
					}
				);

		/**
		 * @param {Yargs} yargs
		 * @return {Yargs}
		 */
		const demandDevice = (yargs) => yargs
			.positional('device', {
				describe: 'Device name',
				type: 'string'
			});

		return yargs
			.command(
				'install <device>',
				'Install app on a device',
				demandDevice,
				async ({device}) => {
					logger.verbose(`Installing application`);
					const ipk = await this._findIpk(distPath);

					logger.debug(`Found ipk file: ${ipk}`);

					await install(toolsDir, ipk, device);
					logger.info(`Installation successful`);
				}
			)
			.command(
				'launch <device> [appId]',
				'Launch app on a device',
				(yargs) => {
					demandDevice(yargs);
					demandAppId(yargs);
				},
				async ({device, appId}) => {
					logger.verbose(`Launching ${appId} on ${device}`);
					await launch(toolsDir, appId, device);
					logger.info(`Application launched`);
				}
			)
			.command(
				'inspect <device> [appId]',
				'Inspect app on a device',
				(yargs) => {
					demandDevice(yargs);
					demandAppId(yargs);
				},
				async ({device, appId}) => {
					logger.verbose(`Starting ${appId} on ${device} with inspector`);
					const debuggerUrl = await inspect(toolsDir, appId, device);
					logger.output(`Debugger url: ${debuggerUrl}`);
				}
			)
			.command(
				'uninstall <device> [appId]',
				'Remove installed app from a device',
				(yargs) => {
					demandDevice(yargs);
					demandAppId(yargs);
				},
				async ({device, appId}) => {
					logger.verbose(`Uninstalling ${appId} from ${device}`);
					await uninstall(toolsDir, appId, device);
					logger.info(`Application uninstalled`);
				}
			)
			.command(
				'list <device>',
				'List installed applications on a device',
				demandDevice,
				async ({device}) => {
					logger.verbose(`Querying installed apps on ${device}`);
					const apps = await getInstalledApps(toolsDir, device);
					if (apps.length) {
						logger.output(`Installed applications: \n\t${apps.join('\n\t')}`);
					} else {
						logger.output('No apps installed');
					}
				}
			)
			.command(
				'clean <device>',
				'Remove all installed apps from a device',
				demandDevice,
				async ({device}) => {
					logger.verbose(`Cleaning installed apps from ${device}`);
					const installedApps = await getInstalledApps(toolsDir, device);

					if (!installedApps.length) {
						logger.output('No apps installed, nothing to clean');
						return;
					}

					const {confirmed} = await inquirer.prompt({
						type: 'checkbox',
						name: 'confirmed',
						message: 'Following applications will be removed:',
						choices: installedApps,
						default: installedApps
					});

					await Promise.all(confirmed.map((appId) => uninstall(toolsDir, appId, device)));
					logger.info(`Cleanup done`);
				}
			)
			.demandCommand(1, 1, 'No command specified')
			.fail((message, error) => {
				if (message) {
					logger.error(message);
				}
				if (error instanceof Error) {
					logger.error(error.toString());
					logger.debug(error.stack);
				}

				yargs.showHelp();
				process.exit(1);
			});
	}

	/**
	 * @override
	 */
	async pack(app, distDir) {
		const config = app.getConfig();
		const {name, version} = app.getAppPackageJson();
		/**
		 * @type {PlatformWebOS.Config}
		 */
		const originalUserConfig = config.platforms.webos;

		const defaultAppInfo = this._createDefaultAppInfo(name, version);

		const userImgConfig = await this._createUserImgConfig(originalUserConfig.img);
		const images = await this._checkAndFilterImages(userImgConfig);

		const defaultImgConfig = this._generateDefaultImageFullPathObject(__dirname);
		const resultImgConfig = mergeConfigs(defaultImgConfig, images);
		await this._copyImages(distDir, resultImgConfig);

		const userAppInfo = originalUserConfig.appinfo;
		const appInfo = userAppInfo ? mergeConfigs(defaultAppInfo, userAppInfo) : defaultAppInfo;
		const resultAppInfo = mergeConfigs(
			appInfo,
			PlatformWebOS.ImageDistPath
		);

		await fse.writeJson(path.join(distDir, 'appinfo.json'), resultAppInfo);

		const dirsToBuild = [distDir, originalUserConfig.serviceDir].filter(Boolean);

		await build(config.platforms.webos.toolsDir, dirsToBuild);
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
	 * @return {Object<PlatformWebOS.ImageName, string>}
	 * @protected
	 */
	async _checkAndFilterImages(files) {
		/**
		 * @param {boolean} condition
		 * @param {function(): Error} getRejectReason
		 * @return {Promise}
		 */
		const promisifyBoolean = (condition, getRejectReason) => condition ?
			Promise.resolve() :
			Promise.reject(getRejectReason());

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
				() => promisifyBoolean(!!requiredSize, () => new Error(`Unknown image "${imageName}"`)),
				() => promisifyBoolean(extension === '.png', () => new Error(`${imageName} is not a png file`)),
				() => fse.exists(imagePath)
					.then((exists) =>
						exists ?
							Promise.resolve() :
							Promise.reject(new Error(`Could not find "${imageName}" by path ${imagePath}`))
					),
				() => new Promise((resolve, reject) => {
					try {
						const {width, height} = imageSize(imagePath);
						const [requiredWidth, requiredHeight] = requiredSize;

						if (width !== requiredWidth || height !== requiredHeight) {
							reject(new Error(
								`Incorrect size of ${basename}: ` +
								`expected ${requiredWidth}x${requiredHeight}, ` +
								`got ${width}x${height}`
							));
						}
					} catch (e) {
						reject(new Error(`Failed to read size of ${basename}: ${e.message}`));
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

					accumulator[imageName] = imagePath;
				} catch (warning) {
					logger.warn(warning);
				}

				return Promise.resolve(accumulator);
			}, Promise.resolve({}));
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

				logger.silly(`Copying, ${sourcePath} to ${destinationPath}`);
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

	/**
	 * @param {string} distPath
	 * @return {Object}
	 * @protected
	 */
	async _getAppInfo(distPath) {
		const rawAppInfo = await fse.readFile(path.join(distPath, 'appinfo.json'));

		return JSON.parse(rawAppInfo);
	}

	/**
	 * @param {string} distPath
	 * @return {string}
	 * @protected
	 */
	async _findAppId(distPath) {
		const {id} = await this._getAppInfo(distPath);

		if (!id) {
			throw new Error('There is no Application ID in appinfo.json');
		}

		return id;
	}

	/**
	 * @param {string} distPath
	 * @return {string}
	 * @protected
	 */
	async _findIpk(distPath) {
		const distFilenames = await fse.readdir(distPath);
		const ipkFilename = distFilenames.find((filename) => filename.endsWith('.ipk'));

		if (!ipkFilename) {
			throw new Error(`There is no .ipk file in ${distPath}`);
		}

		return path.join(distPath, ipkFilename);
	}
}


/**
 * @typedef {?}
 */
let Yargs;

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
 *     appinfo: Object
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
