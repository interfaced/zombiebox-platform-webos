/*
 * This file is part of the ZombieBox package.
 *
 * Copyright (c) 2014-2019, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

const {exec, spawn} = require('child_process');
const fse = require('fs-extra');
const inquirer = require('inquirer');
const path = require('path');

const noop = () => {/* noop */};

const logify = (promise) => promise
	.then((data) => {
		if (data) {
			console.info(data);
		}

		return data;
	})
	.catch((error) => {
		if (error) {
			console.error(error.message);
		}

		throw error;
	});

/**
 * @param {string} command
 * @param {string} expectedSuccessMessage
 * @return {Promise}
 */
function execCommand(command, expectedSuccessMessage) {
	return new Promise((resolve, reject) => {
		exec(command, (error, stdout, stderr) => {
			console.log(stdout);

			if (stderr) {
				console.error(stderr);
			}

			if (error) {
				reject(error);
			}

			const stdoutHasExpectedSuccessMessage = stdout.includes(expectedSuccessMessage);

			if (!error && stdoutHasExpectedSuccessMessage) {
				resolve();
			}

			if (!error && !stdoutHasExpectedSuccessMessage) {
				throw new Error(`Result doesn't include string: "${expectedSuccessMessage}"`);
			}
		});
	});
}

/**
 * @param {string} str
 * @return {?Array<string>}
 */
function matchApplicationId(str) {
	return str.match(/^[a-z]+\.[a-z-.]+-[a-z0-9]+$/gm);
}

/**
 * @param {string} distPath
 * @return {Promise<string>}
 */
function getRawAppInfo(distPath) {
	try {
		return fse.readFile(path.join(distPath, 'appinfo.json'));
	} catch (e) {
		throw new Error(`Could not read application info at "${distPath}": ${e.message}`);
	}
}

/**
 * @param {string} distPath
 * @return {Object}
 */
async function getAppInfo(distPath) {
	const rawAppInfo = await getRawAppInfo(distPath);

	return JSON.parse(rawAppInfo);
}

/**
 * @param {string} distPath
 * @return {string}
 */
async function getAppIdFromLocalBuild(distPath) {
	const {id: appId} = await getAppInfo(distPath);

	if (!appId) {
		throw new Error('There is no Application ID in appinfo.json');
	}

	return appId;
}

/**
 * @param {string} toolsDir
 * @param {string} deviceName
 * @return {Promise<Array<string>, Error<string>>}
 */
function getInstalledApps(toolsDir, deviceName) {
	return new Promise((resolve, reject) => {
		const aresInstall = spawn(path.join(toolsDir, 'ares-install'), ['-d', deviceName, '-l']);
		let appIds = [];

		const onData = (chunk) => {
			const matchedIds = matchApplicationId(chunk.toString());

			if (matchedIds !== null) {
				appIds = appIds.concat(matchedIds.map((id) => id.trim()));
			}
		};

		aresInstall.stdout.on('data', onData);

		aresInstall.stderr.on('error', (error) => {
			reject(error);
		});

		aresInstall.on('close', (code) =>
			code === 0 ?
				resolve(appIds) :
				reject(new Error('Could not get installed apps'))
		);
	});
}

/**
 * @param {string} toolsDir
 * @param {string} deviceName
 * @return {Array<string>}
 */
async function demandInstalledApps(toolsDir, deviceName) {
	const installedApps = await getInstalledApps(toolsDir, deviceName);

	if (!installedApps.length) {
		throw new Error('No apps found on a device');
	}

	return installedApps;
}

/**
 * @param {string} toolsDir
 * @param {string} deviceName
 * @return {Promise<string>}
 */
async function selectAppFromDevice(toolsDir, deviceName) {
	const installedApps = await demandInstalledApps(toolsDir, deviceName);

	const {appId} = await inquirer.prompt({
		type: 'list',
		name: 'appId',
		message: 'Select which application to run (sorted from newest to oldest)',
		choices: installedApps.reverse()
	});

	return appId;
}

/**
 * @param {string} distPath
 * @return {string}
 */
async function getIpkFilename(distPath) {
	const distFilenames = await fse.readdir(distPath);
	const ipkFilename = distFilenames.find((filename) => filename.endsWith('.ipk'));

	if (!ipkFilename) {
		throw new Error(`There is no .ipk file in ${distPath}`);
	}

	return ipkFilename;
}

/**
 * @param {string} toolsDir
 * @param {string} distPath
 * @param {string} deviceName
 * @return {Promise}
 */
async function install(toolsDir, distPath, deviceName) {
	const ipkFilename = await getIpkFilename(distPath);

	return execCommand(
		`${path.join(toolsDir, 'ares-install')} ${path.join(distPath, ipkFilename)} -d ${deviceName}`,
		'Success'
	);
}

/**
 * @param {string} toolsDir
 * @param {string} appId
 * @param {string} deviceName
 * @return {Promise}
 */
function launch(toolsDir, appId, deviceName) {
	return execCommand(
		`${path.join(toolsDir, 'ares-launch')} ${appId} -d ${deviceName}`,
		'Launched'
	);
}

/**
 * @param {string} toolsDir
 * @param {string} appId
 * @param {string} deviceName
 * @return {Promise}
 */
async function inspect(toolsDir, appId, deviceName) {
	return new Promise((resolve, reject) => {
		const aresInspect = spawn(path.join(toolsDir, 'ares-inspect'), ['-d', deviceName, appId]);

		const onData = (chunk) => {
			const chunkString = chunk.toString();
			const debugStartedMessage = 'Application Debugging - ';

			if (chunkString.includes(debugStartedMessage)) {
				const url = chunkString.slice(debugStartedMessage.length).trim();

				console.info(`Inspect panel is listening on ${url}`);

				aresInspect.stdout.off('data', onData);
			}
		};

		aresInspect.stdout.on('data', onData);

		aresInspect.stderr.on('data', (chunk) => {
			const chunkString = chunk.toString();

			if (chunkString !== 'ares-inspect') {
				console.error(chunkString);
			}
		});

		aresInspect.on(
			'close',
			(code) => code === 0 ? resolve() : reject()
		);

		aresInspect.on('error', () => {
			reject();
		});

		process.once('SIGINT', () => {
			console.info('Stopping inspect…');
			aresInspect.kill('SIGINT');
		});
	});
}

/**
 * @param {string} toolsDir
 * @param {string} deviceName
 * @return {Promise<void, Error<string>>}
 */
async function clean(toolsDir, deviceName) {
	const installedApps = await demandInstalledApps(toolsDir, deviceName);

	console.info(`Following applications will be removed:\n- ${installedApps.join('\n- ')}`);

	const {isConfirmed} = await inquirer.prompt({
		type: 'confirm',
		name: 'isConfirmed',
		message: 'Continue?',
		default: false
	});

	return isConfirmed ?
		Promise.all(
			installedApps.map((appId) =>
				new Promise((resolve, reject) => {
					const aresInstall = spawn('ares-install', ['-d', deviceName, '--remove', appId]);

					aresInstall.on('data', (chunk) => console.log(chunk.toString()));
					aresInstall.on('error', (chunk) => console.error(chunk.toString()));
					aresInstall.on('close', (code) => {
						if (code !== 0) {
							return reject(`Failed to remove ${appId}`);
						}

						console.log(`${appId}`);

						return resolve();
					});
					aresInstall.on('error', () => reject());
				})
			)
		)
			.then(() => undefined) :
		Promise.resolve();
}

/**
 * @param {string} toolsDir
 * @param {string} deviceName
 * @return {Promise}
 */
async function list(toolsDir, deviceName) {
	const installedApps = await getInstalledApps(toolsDir, deviceName);

	console.info(installedApps.join('\n'));
}

/**
 * @param {Yargs} yargs
 * @param {Application} app
 * @param {string} toolsDir
 * @return {Yargs}
 */
function buildCLI(yargs, app, toolsDir) {
	const config = app.getConfig();
	const distPath = app.getPathHelper().getDistDir({
		baseDir: config.project.dist,
		version: app.getAppVersion(),
		platformName: 'webos'
	});

	/**
	 * @param {Yargs} yargs
	 * @return {Yargs}
	 */
	const demandAppId = (yargs) =>
		yargs
			.positional(
				'a',
				{
					describe: 'Application ID to use',
					alias: 'app-id',
					type: 'string'
				}
			)
			.middleware(
				async (argv) => {
					if (!argv.appId) {
						console.info('Application identifier was not provided.');

						try {
							argv.appId = await getAppIdFromLocalBuild(distPath);

							console.warn(
								'Using application ID from your build folder. ' +
								'This warning is safe to ignore if you’re trying to run ' +
								'same build as in your build folder.'
							);
						} catch (e) {
							console.error(`Could not extract application ID from local build: ${e.message}`);

							const selectedAppId = await selectAppFromDevice(toolsDir, argv.device);

							argv.appId = selectedAppId;
						}
					}
				}
			);

	return yargs
		.option(
			'd',
			{
				alias: 'device',
				describe: 'Use device',
				demandOption: true,
				type: 'string'
			}
		)
		.command(
			'install',
			'Install app on a device',
			noop,
			({device}) => logify(install(toolsDir, distPath, device))
		)
		.command(
			'launch',
			'Launch app on a device',
			demandAppId,
			({appId, device}) => logify(launch(toolsDir, appId, device))
		)
		.command(
			'inspect',
			'Inspect app on a device',
			demandAppId,
			({appId, device}) => logify(inspect(toolsDir, appId, device))
		)
		.command(
			'list',
			'List installed applications on a device',
			noop,
			({device}) => logify(list(toolsDir, device))
		)
		.command(
			'clean',
			'Remove all installed apps from a device',
			noop,
			({device}) => logify(clean(toolsDir, device))
		);
}

module.exports = buildCLI;
