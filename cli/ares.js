/*
 * This file is part of the ZombieBox package.
 *
 * Copyright (c) 2014-2019, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
const path = require('path');
const execa = require('execa');


/**
 * @param {string} toolsDir
 * @param {string} executable
 * @return {string}
 */
function getExecutable(toolsDir, executable) {
	const base = toolsDir || process.env.WEBOS_CLI_TV || '';
	return path.join(base, executable);
}


/**
 * @param {string} toolsDir
 * @param {string} command
 * @param {Array<string>} args
 * @param {string=} expectedSuccessMessage
 * @return {Promise}
 */
async function exec(toolsDir, command, args, expectedSuccessMessage) {
	const executable = getExecutable(toolsDir, command);

	const result = await execa(
		executable,
		args,
		{
			all: true
		}
	);

	if (expectedSuccessMessage && !result.stdout.includes(expectedSuccessMessage)) {
		console.log(result.stdout);
		console.error(result.stderr);

		throw new Error(`${command} failed`);
	}

	return result.all;
}


/**
 * @param {string} toolsDir
 * @param {string} deviceName
 * @return {Promise<Array<string>, Error<string>>}
 */
async function getInstalledApps(toolsDir, deviceName) {
	const result = await exec(
		toolsDir,
		'ares-install',
		['-d', deviceName, '-l']
	);

	return result.split(/\s+/);
}

/**
 * @param {string} toolsDir
 * @param {string} srcDir
 * @param {string=} outDir
 * @return {Promise}
 * @protected
 */
async function build(toolsDir, srcDir, outDir = srcDir) {
	await exec(
		toolsDir,
		'ares-package',
		[srcDir, '--outdir', outDir, '--no-minify']
	);

	console.log(`The ipk package was built into ${outDir}`);
}


/**
 * @param {string} toolsDir
 * @param {string} ipk
 * @param {string} deviceName
 * @return {Promise}
 */
async function install(toolsDir, ipk, deviceName) {
	await exec(
		toolsDir,
		'ares-install',
		[ipk, '-d', deviceName],
		'Success'
	);
	console.log(`Installed ${path.basename(ipk)}`);
}


/**
 * @param {string} toolsDir
 * @param {string} appId
 * @param {string} deviceName
 * @return {Promise}
 */
async function launch(toolsDir, appId, deviceName) {
	await exec(
		toolsDir,
		'ares-launch',
		[appId, '-d', deviceName],
		'Launched'
	);
	console.log(`Launched ${appId}`);
}


/**
 * @param {string} toolsDir
 * @param {string} appId
 * @param {string} deviceName
 * @return {Promise}
 */
async function inspect(toolsDir, appId, deviceName) {
	const executable = getExecutable(toolsDir, 'ares-inspect');

	const subprocess = execa(
		executable,
		['-d', deviceName, appId],
		{
			all: true
		}
	);

	subprocess.stdout.pipe(process.stdout);
	await subprocess;
}


/**
 * @param {string} toolsDir
 * @param {string} appId
 * @param {string} deviceName
 * @return {Promise}
 */
async function uninstall(toolsDir, appId, deviceName) {
	await exec(
		toolsDir,
		'ares-install',
		['-d', deviceName, '--remove', appId]
	);
	console.log(`Uninstalled ${appId}`);
}


module.exports = {
	getInstalledApps,
	build,
	install,
	launch,
	inspect,
	uninstall
};