# NodeS7CommPlus
NodeS7CommPlus is an API that allows javascript applications to use the S7CommPlusDriver (written in c#) via edge-js and communicate with Siemens S7-1200/1500 controllers
(NOTE: Parts of this documenatation are still under development)

## Authors
The NodeS7CommPlus API was developed by Brett Gattinger

## Credits
This project utilizes the S7CommPlusDriver library developed by Thomas Wiens licensed under the [GNU Lesser General Public License, Version 3](https://www.gnu.org/licenses/lgpl-3.0.html) 
and relies on the edge-js Node Module originally developed by Tomasz Janczuk licensed under the [MIT License](https://mit-license.org/), currently maintained by [agracio](https://github.com/agracio).

The S7CommPlusDriver library is avaialable at:
https://github.com/thomas-v2/S7CommPlusDriver

The edge-js module is available at:
https://github.com/agracio/edge-js 

## Installation
Using npm:
* `npm install nodes7commplus`

## How NodeS7CommPlus works with Edge-Js and S7CommPlus
The NodeS7CommPlus module works with Edge-Js and S7CommPlus via files included in the ns7cpLib folder bundled in the module. 
Inside the ns7cpLib are three subdirectories:
- EdgeJsLib
- EdgeJsNative
- S7CommPlus

The EdgeJsLib folder contains the EdgeJs.dll file which is critical to the operation of edge-js module. NodeS7CommPlus sets the EDGE_APP_ROOT 
environment variable used by edge-js (see the edge-js documentation) to point to this file in the ns7cp folder. The EDGE_APP_ROOT environment 
variable in edge-js is used to specify the root directory from which edge-js locates and uses compiled .NET assemblies that it needs to function 
(i.e. the EdgeJs.dll). The EdgeJs.dll file can also be found in node_modules/edge-js/lib/bootstrap/bin/Release, it was stored in the 
ns7cpLib/EdgeJSLib folder simply to provide NodeS7CommPlus with a consistent relative location from which to set the EDGE_APP_ROOT environment 
variable when running in both normal and yao-pkg execution environments. 
(see Single Executable Packaging with Pkg). 

The EdgeJsNative folder contains the edge_coreclr.node and edge_nativeclr.node files. NodeS7CommPlus sets the EDGE_NATIVE environment variable 
used by edge-js (see the edge-js documentation) to point to the edge_coreclr.node file in the ns7cp folder and then also sets the EDGE_USE_CORECLR
environemnt variable to 1 (true). The EDGE_NATIVE environment variable in edge-js is used to explicitly specify the path to the native .node binding 
file that edge-js should load and use at runtime. The node files serve as bridge between Node.js and the .NET runtime and allow JavaScript applications
(Node.js) to call C#/.NET code. These node files can also be found within node_modules/edge-js/lib/native and can be compiled from source files in 
node_modules/edge-js/src using node-gyp, they were stored in the ns7cpLib/EdgeJSNative folder simply to provide NodeS7CommPlus with a consistent relative 
location from which to set the EDGE_NATIVE environment variable when running in both normal and yao-pkg execution environments. 
(see Single Executable Packaging with Pkg). 

The S7CommPlus folder contains the S7CommPlus dll files:
- S7CommPlusDriver.dll: The core of S7CommPlus compiled from the S7CommPlus source
- libcrypto-3-x64.dll: A dependency of the S7CommPlusDriver
- libssl-3-x64.dll: A dependency of the S7CommPlusDriver
- zlib.net.dll: A dependency of the S7CommPlusDriver
- S7CommPlusWrapper.dll: The C# side of the NodeS7CommPlus API that wraps and uses the S7CommPlusDriver
The S7CommPlusWrapper.dll was written by brett gattinger. The Javascript code in the NodeS7CommPlus module calls upon the wrapper functions in the S7CommPlusWrapper.dll which in turn calls upon the S7CommPlusDriver faciliatating communication to a PLC  

This schema is based on the [edgeJs-pkg compatiblity fix](#https://github.com/agracio/edge-js-pkg) developed by [agracio](#https://github.com/agracio)
and [BeneRasche](#https://github.com/BeneRasche) in repsonse to the edgeJs-pkg compatiblity issue: https://github.com/agracio/edge-js/issues/243 
The schema may be changed in future updates.


## Single Executable packaging with Pkg (NOTE: this section of the documenatation is still under development)
NodeS7CommPlus is designed to be packaged into a single executable file using [yao-pkg](#https://github.com/yao-pkg/pkg). It relies on the ns7cpLib folder
being included as an asset in the pkg executable as, at runtime, it will extract the contents of the asset-packaged ns7cpLib folder to a temporary folder on
disk and load the contents from there. This is done becuase the node and dll files in the folder cannot be loaded into an application at runtime from
yao-pkg's virtual file system (see yao-pkg documenation). Yao-pkg does technically have functionality that allows it to handle node file loading in a similar
manner but the design decision was made to simply make NodeS7CommPlus handle it itself to allow for more control.   

## API
- [initiateConnection()](#initiate-connection)
- [checkConnection()](#check-connection)
- [getTagInfo()](#get-tag-info)
- [addItems()](#add-items)
- [removeItems()](#remove-items)
- [readAllItems()](#read-all-items)
- [writeItems()](#write-items)
- [dropConnection()](#drop-connection)
- [setTranslationCB()](#set-translation-cb)
 
### <a name="initiate-connection"></a>nodes7CommPlus.initiateConnection(connInput, callback)
#### Description  
Connects to a PLC.
#### Arguments  
##### `connInput`  
A JavaScript object with the following structure:
```js
connInput = {
  host: "x.x.x.x",
  password: "plcPassword",
  timeout: 0
}
```
| Property   | Type   | Default           | Description                                                       |
|------------|--------|-------------------|-------------------------------------------------------------------|
| `host`     | string | `"192.168.8.106"` | The IP address of the PLC to connect to.                          |
| `password` | string | `""`              | The password required to access the PLC.                          |
| `timeout`  | number | `5000`            | Timeout in milliseconds for the connection attempt.               |
##### `callback(errOutput, connOutput)`  
A callback function receiving an error object (`errOutput`) and a result object (`connOutput`).
###### `errOutput`  
A JavaScript object returned if the connection fails:
```js
errOutput = {
  code: "an error code",
  message: "an error message",
  stack: "error stack trace"
}
```
| Property   | Type   | Description            |
|------------|--------|------------------------|
| `code`     | string | The error code.        |
| `message`  | string | The error message.     |
| `stack`    | string | The error stack trace. |
###### `connOutput`  
A JavaScript object returned on success:
```js
connOutput = {
  connRes: 0,
  connSessID: 123456789
}
```
| Property     | Type   | Description                                                |
|--------------|--------|------------------------------------------------------------|
| `connRes`    | number | The connection result code (`0` indicates success).        |
| `connSessID` | number | The session ID assigned by the S7CommPlus driver.          |



### <a name="check-connection"></a>nodes7CommPlus.checkConnection(callback)
#### Description  
Checks the status of the connection to the PLC
#### Arguments
##### `callback(errOutput, checkConnOutput)`
A callback function receiving an error object (`errOutput`) and a result object (`checkConnOutput`).
###### `errOutput`  
A JavaScript object returned if an error occurs while checking the connection to the PLC:
```js
errOutput = {
  code: "an error code",
  message: "an error message",
  stack: "error stack trace"
}
```
| Property   | Type   | Description            |
|------------|--------|------------------------|
| `code`     | string | The error code.        |
| `message`  | string | The error message.     |
| `stack`    | string | The error stack trace. |
---
###### `checkConnOutput`  
A JavaScript object returned on success:
```js
checkConnOutput = {
  connStatOK: true || false
}
```
| Property     | Type    | Description                                                            |
|--------------|---------|------------------------------------------------------------------------|
| `connStatOK` | boolean | The connection status (true = connection up / false = connection down) |



### <a name="get-tag-info"></a>nodes7Commplus.getTagInfo(callback)
#### Description
Gets a list of all tag information from the PLC 
#### Arguments
##### `callback(errOutput, getTagInfoOutput)`
A callback function receiving an error object (`errOutput`) and a result object (`getTagInfoOutput`).
###### `errOutput`  
A JavaScript object returned if an error occurs while getting tag information from the PLC:
```js
errOutput = {
  code: "an error code",
  message: "an error message",
  stack: "error stack trace"
}
```
| Property   | Type   | Description            |
|------------|--------|------------------------|
| `code`     | string | The error code.        |
| `message`  | string | The error message.     |
| `stack`    | string | The error stack trace. |
###### `getTagInfoOutput`
A Javascript object returned on success:
```js
getTagInfoOutput = {
    getTagInfoRes: 0
    tagInfo: [
        {
            Name: "tagName",
            AccessSequence: "abc123",
            SoftDataType: 1
        },
        ...
    ]
}
```
| Property        | Type   | Description                                           |
|-----------------|--------|-------------------------------------------------------|
| `getTagInfoRes` | number | the get tag info result code (`0` indicates success). |
| `tagInfo`       | array  | an array of tag information objects (see below)       |

Each element of the `tagInfo` array is a Javascript object containing the information of a tag.
This information includes:
- the name of the tag
- the access sequence of the tag (this is an alphanumerical address used internally by the S7CommPlus driver to locate the tag)
- the soft data type of the tag (this is a numerical value used internally by the S7CommPlus driver to encode the datatype of the tag)



### <a name="add-items"></a>nodes7CommPlus.addItems(items) 
#### Description
Adds `items` to the internal read polling list
#### Arguments
##### `items`
a single tag access sequence or an array of tag access sequences. 
(a tag access sequence is an alphanumerical string address used internally by the S7CommPlus driver, use the [getTagInfo()](#get-tag-info) function
to obtain the access sequences of tags within the PLC)



### <a name="remove-items"></a>nodes7CommPlus.removeItems(items) 
#### Description
Removes `items` from the internal read polling list
#### Arguments
##### `items`
a single tag access sequence or an array of tag access sequences. 
(a tag access sequence is an alphanumerical string address used internally by the S7CommPlus driver, use the [getTagInfo()](#get-tag-info) function
to obtain the access sequences of tags within the PLC)



### <a name="read-all-items"></a>nodes7CommPlus.readAllItems(callback)
#### Description
Reads the internal polling list and calls `callback` when done
#### Arguments
##### `callback(anyReadErrors, readOutputObject, errOutput)`
A callback function receiving a boolean value (`anyReadErrors`) a read result object (`readOutputObject`) and an error object (`errOutput`).
###### `anyReadErrors`
A boolean value indicating if there were any tags that failed to be read from in the internal read polling list
###### `readOutputObject`
A Javascript object returned if there was at least one tag in the internal read polling list that was successfully read from.
The object will consist of a sequence of tagAccessSequence-tagValue pairs read in from the PLC
```js
readOutputObject = {
    "<tagAccessSequence>": "<tagValueRead>",
    ...
}
```
For any tag whose value failed to be read in, the tagValue of its tagAccessSequence-tagValue pair in the readOutputObject will be the string literal 'BAD'
###### `errOutput`  
A JavaScript object returned if an error occurs while getting tag information from the PLC:
```js
errOutput = {
  code: "an error code",
  message: "an error message",
  stack: "error stack trace"
}
```
| Property   | Type   | Description            |
|------------|--------|------------------------|
| `code`     | string | The error code.        |
| `message`  | string | The error message.     |
| `stack`    | string | The error stack trace. |



### <a name="write-items"></a>nodes7CommPlus.writeItems(tagAccSeqs = [], tagWriteVals = [], callback)
#### Description
Writes the values in `tagWriteVals` to the tags in the PLC at the addresses in `tagAccSeqs` (by position if they are arrays - must be of equal length then), and then calls `callback` when done
#### Arguments
##### `tagAccSeqs`
a single tag access sequence or an array of tag access sequences. 
(a tag access sequence is an alphanumerical string address used internally by the S7CommPlus driver, use the [getTagInfo()](#get-tag-info) function
to obtain the access sequences of tags within the PLC)
##### `tagWriteVals`
a single value or an array of values (datatypes will vary depening on the expected data type of the tag they are to be written to)
##### `callback(anyWriteErrors, writeOutputObject, errOutput)`
A callback function receiving a boolean value (`anyWriteErrors`) a write result object (`writeOutputObject`) and an error object (`errOutput`).
###### `anyWriteErrors`
A boolean value indicating if there were any tags in that failed to be written to
###### `writeOutputObject`
A Javascript object returned if there was at least one tag that was successfully written to.
The object will consist of a sequence of tagAccessSequence-tagWriteStatus pairs
```js
readOutputObject = {
    "<tagAccessSequence>": "<tagWriteStatus>",
    ...
}
```
For any tag whose value failed to be written to, the tagWriteStatus of its tagAccessSequence-tagWriteStatus pair in the writeOutputObject will be the string literal 'BAD'
otherwise it will be the string literal 'OK'
###### `errOutput`  
A JavaScript object returned if an error occurs while writing tag values to the PLC:
```js
errOutput = {
  code: "an error code",
  message: "an error message",
  stack: "error stack trace"
}
```
| Property   | Type   | Description            |
|------------|--------|------------------------|
| `code`     | string | The error code.        |
| `message`  | string | The error message.     |
| `stack`    | string | The error stack trace. |



### <a name="drop-connection"></a>nodes7CommPlus.dropConnection(callback)
#### Description
Disconnects from the PLC (Terminates the TCP connection)
#### Arguments
##### `callback(errOutput, disConnOutput)`
A callback function receiving an error object (`errOutput`) and a result object (`disConnOutput`).
###### `errOutput`  
A JavaScript object returned if the connection fails:
```js
errOutput = {
  code: "an error code",
  message: "an error message",
  stack: "error stack trace"
}
```
| Property   | Type   | Description            |
|------------|--------|------------------------|
| `code`     | string | The error code.        |
| `message`  | string | The error message.     |
| `stack`    | string | The error stack trace. |
###### `disConnOutput`  
A JavaScript object returned on success:
```js
connOutput = {
  connDisconnected: true || false
}
```
| Property              | Type    | Description                                                                                     |
|-----------------------|---------|-------------------------------------------------------------------------------------------------|
| `connDisconnected`    | boolean | The disconnect operation status (true = connection disconnected / false = failed to disconnect) |



### <a name="set-translation-cb"></a>nodes7CommPlus.setTranslationCB()
#### Description
This function literally does nothing, it is only included as part of making this module compatible/usable with [honcho](#https://www.npmjs.com/package/honcho)
(when honcho uses a communication protocol module like nodes7 or nodes7CommPlus it inevitably calls the setTranslationCB() function, it is included here to avoid
'undefined' errors when honcho uses the nodes7CommPlus module)