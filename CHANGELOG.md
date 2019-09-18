# Changelog

## 2.1.1 (18.09.2019)

### Fixes
* Fixed `launch` and `inspect` CLI commands not being able to demand app id.

## 2.1.1 (05.09.2019)

### Improvements
* Use webOS pointer detection api instead of sniffing mouse events
* Update to ESLint 6

## 2.1.0 (23.07.2019)

### Features
* `Video` and `Device` classes adapted to removal of video container from ZombieBox.

## 2.0.0 (13.06.2019)

### Improvements
* Support ZombieBox 2.0

### Fixes
* Fix incorrect config reference

## 2.0.0-alpha.3 (23.05.2019)

### Improvements
* Support ZombieBox alpha.8 (implement `AbstractExtension`)
* Drop support for Node 8

## 2.0.0-alpha.2 (21.03.2019)

### Fixes
* zb-platform-test was updated to 2.0

## 2.0.0-alpha.1 (13.02.2019)

Platform code migrated to ECMAScript modules.

## 1.0.1 (04.02.2019)

### Fixes

* Fix GCC warnings in Video

## 1.0.0 (31.01.2019)

### Improvements
* **4342** Integrated platform testing suite
* **7404** Implemented `Device.getIP` method

## v0.6.0 (26.01.2018)

### Features

* **#6167** Throw error `zb.device.errors.UnsupportedFeature` for unsupported platform feature. **[BREAKING]**

## v0.5.2 (13.12.2017)

### Features

* **#6494** Added CLI command install, run to platform.

### Improvements

* **#6501** Updated eslint and fix errors.

## v0.5.1 (22.09.2017)

### Fixes

* **#6372** Fixed initialization fail on webOS 1.0

## v0.5.0 (16.08.2017)

### Features

* **#6289** Change getters for versions [BREAKING_BACK]

### Fixes

* **#6290** Removed default resolution

## v0.4.0 (24.05.2017)

### Features

* **#5907** Added getting duid.
* **#6085** Implemented getting locale. See `Info#locale`.
* **#6062** Implemented getter for launch parameters.

## v0.3.0 (09.03.2017)

### Features

* **#5625** Remove method `Device#processBackKey`. [BREAKING_BACK]

### Fixes

* **#5876** Fix playing video from position.
* **#6000** Fix aspect-ratio namespaces.

## v0.2.2 (24.01.2016)

### Features

* **#5845** Added getting ares-package paths from variable of user environment setted WebOS IDE.

## v0.2.1 (15.12.2016)

### Features

* **#5042** Added factory method `zb.device.platforms.webos.factory.createDevice` for create Device instances.
  All global dependencies now located in factory method.
* **#5042** All *.es6 files renamed to *.js

### Fixes

* **#5612** Fixed exit with back button.

## v0.2.0 (27.07.2016)

### Features

* **#3999** Add ViewPort class which is responsible for managing display area sizes and aspect ratio
* **#4124** Add default and user icons adding
* **#4420** Rename abstract Video class (zb.device.Video) to AbstractVideo (zb.device.AbstractVideo)
* **#4493** Transpiled client-side files to ES6

### Improvements

* **#2233** Partial support of Aspect Ratio
* **#4107** Remove HTML5 prefix in *zb.device.platforms.webos.HTML5Video*
