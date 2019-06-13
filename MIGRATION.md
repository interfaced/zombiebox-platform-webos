# Migration from

## 0.2.x to 0.3.x

### Setting MIME type of video source

#### Only if you using `play` method with second parameter:

* Replace `webOSVideo.play(url, startTime);`
  to `webOSVideo.setMimeType(mimeType); webOSVideo.play(url, startTime);`
* *Notes:* `mimeType` must be correct for playing stream.

### Removed `Device#processBackKey`

* Use `showAppsManager()` in `Application#_backOnEmptyHistory()`
