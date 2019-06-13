### Usage notes

* Before playing video stream you need set correct MIME type of source by calling `setMimeType(<string>)` method.
* If you'll not use second parameter of method `play` then just do nothing or call `setMimeType(null)`.

### Config options

Example configuration:

```javascript
/**
 * @param {Object} config
 * @return {Object}
 */
module.exports = function(config) {
	return {
		platforms: {
			webos: {
				toolsDir: '/opt/webOS_TV_SDK/CLI/bin/',
				appinfo: {
					id: 'com.myco.app.appname',
					title: 'AppName',
					main: 'index.html',
					type: 'web',
					vendor: 'My Company',
					version: '1.0.0',
					appDescription: 'This is an app tagline',
					resolution: '1920x1080',
					bgColor: 'red',
					iconColor: 'red',
					transparent: false
				},
				img: __dirname + '/webos/img'
			}
		}
	};
};
```

**Note:** By default, `zb webos` commands will use cli tools path from your shell's environment variable `WEBOS_CLI_TV` (which is being added by LG's installer by default). If you are getting an error about cli tools not being found, check if it's present in `/etc/profile`. If it's not, add with something like:
```bash
echo 'export WEBOS_CLI_TV="/opt/webOS_TV_SDK/CLI/bin"' >> /etc/profile
```
Then logout from your shell, login back and try again. `/opt/webOS_TV_SDK/CLI/bin` is just an example. Use your SDK location path.

You may also set path to cli tools with `webos.toolsDir` in config file as per example, but it's recommended to use system environment variables to achieve better portability between different systems.

- `webos.toolsDir` (optional field) — path to SDK cli tools.
- `webos.appinfo` — should be filled according [webOS App Metadata structure](http://webostv.developer.lge.com/develop/app-developer-guide/app-metadata/).
- `webos.img` — full path (string) to folder with `icon.png`, `large-icon.png`, `bg-image.png` and `splash-background.png` or object with the following structure:

```javascript
img: {
	[PlatformWebOS.ImageName.ICON]: '/full/path/to/icon.png',
	[PlatformWebOS.ImageName.LARGE_ICON]: __dirname + '/relative/path/to/largeIcon.png',
	[PlatformWebOS.ImageName.BACKGROUND_IMAGE]: __dirname + '/webos/img/1920.png',
	[PlatformWebOS.ImageName.SPLASH_SCREEN_BACKGROUND]: __dirname + '/webos/design/photos/ocean.png'
}
```
`icon`, `largeIcon`, `bgImage`, `splashBackground` of appinfo section will be replaced with default values during build process.

Override `_backOnEmptyHistory`:

```javascript
class Application extends BaseApplication {
	/**
	 * @override
	 */
	_backOnEmptyHistory() {
		return this.isDeviceWebos() ? this.device.showAppsManager() : this.device.exit();
	}
}
```

### Install Application
To install an .ipk file on the TV use `zb webos install`. Pass the device name as a parameter. Application with the same ID will be replaced by newer one.
```bash
zb webos install --device $deviceName
```

_Example:_ `zb webos install --device webOS_2014`

**Note:** If you didn't specify application ID in `webos.appinfo` section, then it will be generated with random postfix every time you run `build` command. When using static ID every new installation on a device will replace old application with newer one. In that situation if you want to persist old copies, consider adding `test` (or any other name you prefer) configuration to your project where you can generate custom ID for every application build and passing it to your `build` command .

### Launch Application
To launch an .ipk file on the TV use `zb webos launch`. Pass the device name as a parameter.
```bash
zb webos launch --device $deviceName
```

_Example:_ `zb webos launch --device webOS_2014`
