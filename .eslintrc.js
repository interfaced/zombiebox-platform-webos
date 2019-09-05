module.exports = {
	extends: 'interfaced',
	overrides: [
		{
			files: ['lib/**/*.js'],
			extends: 'interfaced/esm',
			settings: {
				'import/resolver': 'zombiebox'
			}
		},
		{
			files: ['index.js', 'cli/webos.js'],
			extends: 'interfaced/node',
			rules: {
				'require-atomic-updates': 'off' // Too aggressive with way too many false positives: https://github.com/eslint/eslint/issues/11899
			},
		}
	]
};
