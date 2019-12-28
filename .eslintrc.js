module.exports = {
	extends: 'interfaced',
	overrides: [
		{
			files: ['lib/**/*.js'],
			extends: 'interfaced/esm',
			settings: {
				'import/resolver': 'zombiebox'
			},
			globals: {
				// see externs
				'PalmServiceBridge': 'readonly',
				'PalmSystem': 'readonly'
			}
		},
		{
			files: ['index.js', 'cli/**/*.js'],
			extends: 'interfaced/node'
		},
		{
			files: ['externs/**/*.js'],
			extends: 'interfaced/externs'
		}
	]
};
