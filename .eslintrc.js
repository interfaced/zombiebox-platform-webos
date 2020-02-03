const currentYear = (new Date).getFullYear();
const copyrightHeader = [
	'',
	' * This file is part of the ZombieBox package.',
	' *',
	` * Copyright © 2014-${currentYear}, Interfaced`,
	' *',
	' * For the full copyright and license information, please view the LICENSE',
	' * file that was distributed with this source code.',
	' '
];

module.exports = {
	extends: 'interfaced',
	plugins: [
		'header'
	],
	overrides: [
		{
			files: ['lib/**/*.js'],
			extends: 'interfaced/esm',
			settings: {
				'import/resolver': 'zombiebox',
			},
			rules: {
				'header/header': ['error', 'block', copyrightHeader]
			},
			globals: {
				// see externs
				'PalmServiceBridge': 'readonly',
				'PalmSystem': 'readonly'
			}
		},
		{
			files: ['index.js', 'cli/**/*.js'],
			extends: 'interfaced/node',
			rules: {
				'header/header': ['error', 'block', copyrightHeader]
			}
		},
		{
			files: ['externs/**/*.js'],
			extends: 'interfaced/externs'
		}
	]
};
