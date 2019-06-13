const {join, dirname} = require('path');
const nodeOverrides = require('eslint-config-interfaced/overrides/node');

function resolveModulePath(packageName) {
	const packageInfoPath = require.resolve(`${packageName}/package.json`);

	return join(dirname(packageInfoPath), require(packageInfoPath).module);
}

module.exports = {
	extends: 'interfaced',
	rules: {
		'space-before-function-paren': ['error', {
			named: 'never',
			anonymous: 'always',
			asyncArrow: 'always'
		}]
	},
	overrides: [
		{
			...require('eslint-config-interfaced/overrides/esm'),
			files: ['lib/**/*.js'],
			settings: {
				'import/resolver': {
					alias: [
						['zb', resolveModulePath('zombiebox')]
					]
				}
			}
		},
		{
			files: ['lib/**/*.js'],
			rules: {
				'import/no-unresolved': ['error', {ignore: ['^generated/']}]
			}
		},
		{
			...nodeOverrides,
			files: ['index.js', 'cli/webos.js', 'tester/*.js'],
			rules: {
				...nodeOverrides.rules,
				'node/no-unsupported-features/es-builtins': ["error", { "version": ">=8.9" }],
				'node/no-unsupported-features/es-syntax': ["error", { "version": ">=8.9" }],
				'node/no-unsupported-features/node-builtins': ["error", { "version": ">=8.9" }],
				'node/no-deprecated-api': ['error', {
					'ignoreModuleItems': [
						'url.parse' // TODO: remove once node 8 support is dropped and the deprecation is handled
					]
				}]
			}
		}
	]
};
