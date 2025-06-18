const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

// IMPORT EDGE-JS ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const nodeVersion = process.versions.node.split(".")[0];
const platform = process.platform;
const arch = process.arch;
const pathSep = path.sep;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const ns7cpLib_folder = 'ns7cpLib';
const EdgeJsLib_folder = 'EdgeJSLib';
const EdgeJsNative_folder = 'EdgeJsNative';
const S7CommPlus_folder = 'S7CommPlus';
const S7CommPlusWrapper_lib = 'S7CommPlusWrapper.dll';
const NS7CPlib_path = path.join(__dirname, ns7cpLib_folder);
const NS7CPlib_tempPath = path.resolve(os.tmpdir(), `${ns7cpLib_folder}-${hashString(NS7CPlib_path)}`);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var edgeJsNativePath = null;
var edgeJsLibPath = null;
var s7commplusLibPath = null;
const isPkg = typeof process.pkg !== 'undefined';
if (isPkg) {
    // check to make sure ns7cp_lib folder was bundled
    if (!fs.existsSync(NS7CPlib_path)) {
        throw new Error(
            `Missing bundled asset: ${NS7CPlib_path}\n` +
            `This usually means the asset was not included in your yao-pkg bundle.\n\n` +
            `To fix this, add the following to your yao-pkg.config.js:\n\n` +
            `  assets: [\n    "${NS7CPlib_path}"\n  ]\n\n` +
            `Make sure this path is correct relative to your project root.`
        );
    }

    // extract bundled ns7cp_lib folder to a temporary directory (if not already done)
    if (!fs.existsSync(NS7CPlib_tempPath)) {
        copyDirectorySync(NS7CPlib_path, NS7CPlib_tempPath);
    }
    
    // initialize ns7cp_lib paths
    edgeJsNativePath = path.join(NS7CPlib_tempPath, EdgeJsNative_folder);
    edgeJsLibPath = path.join(NS7CPlib_tempPath, EdgeJsLib_folder);
    s7commplusLibPath = path.join(NS7CPlib_tempPath, S7CommPlus_folder, S7CommPlusWrapper_lib);

} else {
    // initialize ns7cp_lib paths
    edgeJsNativePath = path.join(NS7CPlib_path, EdgeJsNative_folder);
    edgeJsLibPath = path.join(NS7CPlib_path, EdgeJsLib_folder);
    s7commplusLibPath = path.join(NS7CPlib_path, S7CommPlus_folder, S7CommPlusWrapper_lib);
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// resolve remainder of edge-js native files path based on platfrom, architecure, and node verison
// (user will have to make sure the node files for their target platfrom/architecture/nodeversion are built and stored 
// in the appropriate, corresponding subdirectory structure within the ns7cp_lib/EdgeJsNative folder)
if (!hasSubdirectory(edgeJsNativePath, platform)) {
    throw new Error(
        `No ${EdgeJsNative_folder}${pathSep}${platform} subdirectory found in ${NS7CPlib_tempPath}`+
        `edge_nativeclr and edge_coreclr native .node files for the ${platform} platform could not be found`
    );
}
edgeJsNativePath = path.join(edgeJsNativePath, platform);
if (!hasSubdirectory(edgeJsNativePath, arch)) {
    throw new Error(
        `No ${EdgeJsNative_folder}${pathSep}${platform}${pathSep}${arch} subdirectory found in ${NS7CPlib_tempPath}`+
        `edge_nativeclr and edge_coreclr native .node files for the ${arch} architecture could not be found`
    );
}
edgeJsNativePath = path.join(edgeJsNativePath, arch);
if (!hasSubdirectory(edgeJsNativePath, nodeVersion)) {
    throw new Error(
        `No ${EdgeJsNative_folder}${pathSep}${platform}${pathSep}${arch}${pathSep}${nodeVersion} subdirectory found in ${NS7CPlib_tempPath}`+
        `edge_nativeclr and edge_coreclr native .node files for the ${nodeVersion} architecture could not be found`
    );
}
edgeJsNativePath = path.join(edgeJsNativePath, nodeVersion, 'edge_coreclr.node');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// set environemnt variables
process.env.EDGE_NATIVE = edgeJsNativePath;
process.env.EDGE_APP_ROOT = edgeJsLibPath;
process.env.S7COMMPLUS = s7commplusLibPath;
process.env.EDGE_USE_CORECLR=1;
const edge = require('edge-js');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////










// HELPER FUNCTIONS /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function copyDirectorySync(sourceDir, targetDir) {
    // if target directory does not exist create it
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, {recursive: true});
    }

    // iterate through and copy source directory contents while preserving folder structure
    const entries = fs.readdirSync(sourceDir, {withFileTypes: true});
    for (const entry of entries) {
        const sourcePath = path.join(sourceDir, entry.name);
        const targetPath = path.join(targetDir, entry.name);
        if (entry.isDirectory()) {
            copyDirectorySync(sourcePath, targetPath);
        } else {
            const data = fs.readFileSync(sourcePath);
            fs.writeFileSync(targetPath, data);
        }
    }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function hasSubdirectory(parentDir, subDirName) {
    const entries = fs.readdirSync(parentDir, {withFileTypes: true});
    return entries.some(entry => entry.isDirectory() && entry.name === subDirName);
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function hashString(input) {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 8);
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////










// NODES7COMMPLUS CLASS /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
class NodeS7CommPlus {
    constructor() {
        this.host = "";
        this.timeout = 5000;
        this.connectionSessionID = 0;
        this.connSessIdObtained = false;
        this.isConnected = false;
        this.tagMetaDataDict = new Map();
        this.addRemoveArray = [];
        this.readList = [];
        this.writeList = []
        // DEV NOTE:
        // Choosing not to store password when connection parameters 
        // recieved to avoid potential security vulnerabilities
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////
    //                                            CLASS DICTIONARIES
    //////////////////////////////////////////////////////////////////////////////////////////////////////
    static TypeConstant = {
        UNDEFINED: "[object Undefined]",
        NULL: "[object Null]",
        BOOLEAN: "[object Boolean]",
        NUMBER: "[object Number]",
        BIGINT: "[object BigInt]",
        STRING: "[object String]",
        SYMBOL: "[object Symbol]",
        FUNCTION: "[object Function]",
        OBJECT: "[object Object]",
        ARRAY: "[object Array]",
        DATE: "[object Date]",
        REGEXP: "[object RegExp]",
        ERROR: "[object Error]",
        MAP: "[object Map]",
        SET: "[object Set]",
        WEAKMAP: "[object WeakMap]",
        WEAKSET: "[object WeakSet]",
        ARRAYBUFFER: "[object ArrayBuffer]",
        DATAVIEW: "[object DataView]",
        INT8ARRAY: "[object Int8Array]",
        UINT8ARRAY: "[object Uint8Array]",
        INT16ARRAY: "[object Int16Array]",
        UINT16ARRAY: "[object Uint16Array]",
        INT32ARRAY: "[object Int32Array]",
        UINT32ARRAY: "[object Uint32Array]",
        FLOAT32ARRAY: "[object Float32Array]",
        FLOAT64ARRAY: "[object Float64Array]",
        JSON: "[object JSON]",
        PROMISE: "[object Promise]",
        WINDOW: "[object Window]",
        HTMLDOCUMENT: "[object HTMLDocument]",
        NODELIST: "[object NodeList]",
        HTMLHELEMENT: "[object HTMLElement]"
    };
    static GetType(property) {
        return Object.prototype.toString.call(property);
    };
    static IsSingleton(property) {
        return (
            property !== null &&
            typeof property !== "object" &&
            !Array.isArray(property)
        );
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////////

    static Property = {
        HOST: "host",
        PASSWORD: "password",
        TIMEOUT: "timeout",
        TAGFILEDIR: "tagFileDir",
        TAGFILENAME: "tagFileName",
        CONNRES: "connRes",
        CONNSESSID: "connSessID",
        CONNSTAT: "connStatOK",
        GETTAGINFORES: "getTagInfoRes",
        TAGINFO: "tagInfo",
        ITEMSADDED: "itemsAdded",
        S7COMMPLUSITEMS: "s7CommPlusItems",
        READRES: "readRes",
        READVALS: "readVals",
        READERRORS: "readErrs",
        WRITERES: "writeRes",
        WRITEVALS: "writeVals",
        WRITEERRORS: "writeErrs",
        CONNDISCONNECTED: "connDisconnected"  
    };
    static PropertyType = {
        [this.Property.HOST]: NodeS7CommPlus.TypeConstant.STRING,
        [this.Property.PASSWORD]: NodeS7CommPlus.TypeConstant.STRING,
        [this.Property.TIMEOUT]: NodeS7CommPlus.TypeConstant.NUMBER,
        [this.Property.TAGFILEDIR]: NodeS7CommPlus.TypeConstant.STRING,
        [this.Property.TAGFILENAME]: NodeS7CommPlus.TypeConstant.STRING,
        [this.Property.CONNRES]: NodeS7CommPlus.TypeConstant.NUMBER,
        [this.Property.CONNSESSID]: NodeS7CommPlus.TypeConstant.NUMBER,
        [this.Property.CONNSTAT]: NodeS7CommPlus.TypeConstant.BOOLEAN,
        [this.Property.GETTAGINFORES]: NodeS7CommPlus.TypeConstant.NUMBER,
        [this.Property.TAGINFO]: NodeS7CommPlus.TypeConstant.ARRAY,
        [this.Property.ITEMSADDED]: NodeS7CommPlus.TypeConstant.BOOLEAN,
        [this.Property.S7COMMPLUSITEMS]: NodeS7CommPlus.TypeConstant.ARRAY,
        [this.Property.READRES]: NodeS7CommPlus.TypeConstant.NUMBER,
        [this.Property.READVALS]: NodeS7CommPlus.TypeConstant.ARRAY,
        [this.Property.READERRORS]: NodeS7CommPlus.TypeConstant.ARRAY,
        [this.Property.WRITERES]: NodeS7CommPlus.TypeConstant.NUMBER,
        [this.Property.WRITEVALS]: NodeS7CommPlus.TypeConstant.ARRAY,
        [this.Property.WRITEERRORS]: NodeS7CommPlus.TypeConstant.ARRAY,
        [this.Property.CONNDISCONNECTED]: NodeS7CommPlus.TypeConstant.BOOLEAN,
    };
    //////////////////////////////////////////////////////////////////////////////////////////////////////

    static QualityValue = {
        BAD: "BAD",
        OK: "OK"
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////////

    static AddRemoveArrayAction = {
        ADD: "add",
        REMOVE: "remove"
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////////





    //////////////////////////////////////////////////////////////////////////////////////////////////////
    //                                      ERROR HANDLING
    //////////////////////////////////////////////////////////////////////////////////////////////////////
    static ErrorOutput = class {
        static Property = {
            ERRORCODE: "code",
            ERRORMSSG: "message",
            ERRORSTACKTRACE: "stack"
        };

        static PropertyType = {
            [this.Property.ERRORCODE]: NodeS7CommPlus.TypeConstant.STRING,
            [this.Property.ERRORMSSG]: NodeS7CommPlus.TypeConstant.STRING,
            [this.Property.ERRORSTACKTRACE]: NodeS7CommPlus.TypeConstant.STRING
        }

        static ErrorCode = {
            NULL: "ENULLCODE",
            INPUTPARSEERROR: "EINPARSE",
            NOCONNERROR: "ENOCONN",
            DRIVERCONNECTERROR: "EDRIVERCONN",
            DRIVERCHECKCONNERROR: "EDRIVERCHECKCONN",
            DRIVERGETTAGINFOERROR: "EDRIVERGETTAGINFO",
            DRIVERREADTAGSERROR: "EDRIVERREADTAGS",
            DRIVERWRITETAGSERROR: "EDRIVERWRITETAGS",
            DRIVERDISCONNERROR: "EDRIVERDISCONN",
            UNEXPECTEDERROR: "EUNEXPECTED"
        };

        constructor(errorCode = "ENULLCODE", errorInfo = "", errorStacktrace = "") {
            this[NodeS7CommPlus.ErrorOutput.Property.ERRORMSSG] = errorInfo;
            this[NodeS7CommPlus.ErrorOutput.Property.ERRORSTACKTRACE] = errorStacktrace;
            this[NodeS7CommPlus.ErrorOutput.Property.ERRORCODE] = errorCode;
        }
    };
    //////////////////////////////////////////////////////////////////////////////////////////////////////

    



    //////////////////////////////////////////////////////////////////////////////////////////////////////
    //                                    S7COMMPLUS DLL LIBRARY FUNCTIONS                                  
    //////////////////////////////////////////////////////////////////////////////////////////////////////
    static CONNECT = edge.func({
        assemblyFile: process.env.S7COMMPLUS,
        typeName: 'S7CommPlusWrapper.S7CP',
        methodName: 'Connect'
    });
    static CHECK_CONNECTION = edge.func({
        assemblyFile: process.env.S7COMMPLUS,
        typeName: 'S7CommPlusWrapper.S7CP',
        methodName: 'CheckConnection'
    });
    static GET_TAGINFO = edge.func({
        assemblyFile: process.env.S7COMMPLUS,
        typeName: 'S7CommPlusWrapper.S7CP',
        methodName: 'GetTagInfo'
    });
    static READTAGS = edge.func({
        assemblyFile: process.env.S7COMMPLUS,
        typeName: 'S7CommPlusWrapper.S7CP',
        methodName: 'ReadTags'
    });
    static WRITETAGS = edge.func({
        assemblyFile: process.env.S7COMMPLUS,
        typeName: 'S7CommPlusWrapper.S7CP',
        methodName: 'WriteTags'
    });
    static DISCONNECT = edge.func({
        assemblyFile: process.env.S7COMMPLUS,
        typeName: 'S7CommPlusWrapper.S7CP',
        methodName: 'Disconnect'
    });
    //////////////////////////////////////////////////////////////////////////////////////////////////////





    //////////////////////////////////////////////////////////////////////////////////////////////////////
    //                                              CONNECT                                  
    //////////////////////////////////////////////////////////////////////////////////////////////////////
    // DEV NOTE: For Successful connection we need to call GetTagInfo and write the retreived tag 
    //           information to a text file as part of the honcho integration
    //////////////////////////////////////////////////////////////////////////////////////////////////////
    initiateConnection(connInput = {
        [NodeS7CommPlus.Property.HOST]: "192.168.8.106",
        [NodeS7CommPlus.Property.PASSWORD]: "",
        [NodeS7CommPlus.Property.TIMEOUT]: 5000
    }, callback) {
        // Provide console Feedback
        console.log(`Connecting to PLC with parameters:\n${JSON.stringify(connInput, null, 2)}`);

        // Parse Connection Input
        try { this.ParseConnectionInput(connInput); } 
        catch (error) {
            let errOutput = new NodeS7CommPlus.ErrorOutput(
                    NodeS7CommPlus.ErrorOutput.ErrorCode.INPUTPARSEERROR,
                    error.message,
                    error.stack
                );
            callback(errOutput, undefined); 
            return;
        }

        // Connect to PLC
        NodeS7CommPlus.CONNECT(connInput, (error, output) => {
            if (error) {
                let errOutput = new NodeS7CommPlus.ErrorOutput(
                    NodeS7CommPlus.ErrorOutput.ErrorCode.DRIVERCONNECTERROR,
                    error.message,
                    error.stack
                );
                callback(errOutput, undefined);
                return; 
            } else {
                // check S7CommPlus driver connetion result
                if (output[NodeS7CommPlus.Property.CONNRES] !== 0) {
                    let errOutput = new NodeS7CommPlus.ErrorOutput(
                        NodeS7CommPlus.ErrorOutput.ErrorCode.DRIVERCONNECTERROR,
                        `Error: Failed to connect to target PLC @ IP ${connInput[NodeS7CommPlus.Property.HOST]}, Driver Connect Result Code: ${output[NodeS7CommPlus.Property.CONNRES]}`,
                        new Error().stack
                    );
                    callback(errOutput, undefined);
                    return;
                }

                // Save Host IP address, timeout and Connection Session ID information
                this.host = connInput[NodeS7CommPlus.Property.HOST];
                this.timeout = connInput[NodeS7CommPlus.Property.TIMEOUT];
                this.connectionSessionID = output[NodeS7CommPlus.Property.CONNSESSID];

                // Flag connection establishment and connection status
                this.connSessIdObtained = true;
                this.isConnected = true;

                // Build Tag Meta Data Dictionary
                this.buildAndWriteTagMetaData(connInput, callback, output);
            }
        });
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////////

    ParseConnectionInput(connInput) {
        if (NodeS7CommPlus.GetType(connInput) !== NodeS7CommPlus.TypeConstant.OBJECT) {
            throw new InvalidInputError(
                `Invalid Input:
                Input must be an object of form:
                {
                    ${NodeS7CommPlus.Property.HOST}: ${NodeS7CommPlus.PropertyType[NodeS7CommPlus.Property.HOST]},
                    ${NodeS7CommPlus.Property.PASSWORD}: ${NodeS7CommPlus.PropertyType[NodeS7CommPlus.Property.PASSWORD]},
                    ${NodeS7CommPlus.Property.TIMEOUT}: ${NodeS7CommPlus.PropertyType[NodeS7CommPlus.Property.TIMEOUT]}
                }`
            );   
        }
        if (!(NodeS7CommPlus.Property.HOST in connInput)) {
            throw new InvalidInputError(
                `Invalid Input:
                Input connection object is missing property${NodeS7CommPlus.Property.HOST}`
            );
        }
        if (NodeS7CommPlus.GetType(connInput[NodeS7CommPlus.Property.HOST]) 
            !== NodeS7CommPlus.PropertyType[NodeS7CommPlus.Property.HOST]) {
            throw new InvalidInputError(
                `Invalid Input:
                Input connection object property ${NodeS7CommPlus.Property.HOST}
                must be of type ${NodeS7CommPlus.PropertyType[NodeS7CommPlus.Property.HOST]}`
            );
        }
        if (!(NodeS7CommPlus.Property.PASSWORD in connInput)) {
            throw new InvalidInputError(
                `Invalid Input:
                Input connection object is missing property${NodeS7CommPlus.Property.PASSWORD}`
            );
        }
        if (NodeS7CommPlus.GetType(connInput[NodeS7CommPlus.Property.PASSWORD])
            !== NodeS7CommPlus.PropertyType[NodeS7CommPlus.Property.PASSWORD]) {
            throw new InvalidInputError(
                `Invalid Input:
                Input connection object property ${NodeS7CommPlus.Property.PASSWORD}
                must be of type ${NodeS7CommPlus.PropertyType[NodeS7CommPlus.Property.PASSWORD]}`
            );
        }
        if (!(NodeS7CommPlus.Property.TIMEOUT in connInput)) {
            throw new InvalidInputError(
                `Invalid Input:
                Input connection object is missing property${NodeS7CommPlus.Property.TIMEOUT}`
            );
        }
        if (NodeS7CommPlus.GetType(connInput[NodeS7CommPlus.Property.TIMEOUT])
            !== NodeS7CommPlus.PropertyType[NodeS7CommPlus.Property.TIMEOUT]) {
            throw new InvalidInputError(
                `Invalid Input:
                Input connection object property ${NodeS7CommPlus.Property.TIMEOUT}
                must be of type ${NodeS7CommPlus.PropertyType[NodeS7CommPlus.Property.TIMEOUT]}`
            );
        }
        if (!(NodeS7CommPlus.Property.TAGFILEDIR in connInput)) {
            throw new InvalidInputError(
                `Invalid Input:
                Input connection object is missing property${NodeS7CommPlus.Property.TAGFILEDIR}`
            );
        }
        if (NodeS7CommPlus.GetType(connInput[NodeS7CommPlus.Property.TAGFILEDIR])
            !== NodeS7CommPlus.PropertyType[NodeS7CommPlus.Property.TAGFILEDIR]) {
            throw new InvalidInputError(
                `Invalid Input:
                Input connection object property ${NodeS7CommPlus.Property.TAGFILEDIR}
                must be of type ${NodeS7CommPlus.PropertyType[NodeS7CommPlus.Property.TAGFILEDIR]}`
            );
        }
        if (!(NodeS7CommPlus.Property.TAGFILENAME in connInput)) {
            throw new InvalidInputError(
                `Invalid Input:
                Input connection object is missing property${NodeS7CommPlus.Property.TAGFILENAME}`
            );
        }
        if (NodeS7CommPlus.GetType(connInput[NodeS7CommPlus.Property.TAGFILENAME])
            !== NodeS7CommPlus.PropertyType[NodeS7CommPlus.Property.TAGFILENAME]) {
            throw new InvalidInputError(
                `Invalid Input:
                Input connection object property ${NodeS7CommPlus.Property.TAGFILENAME}
                must be of type ${NodeS7CommPlus.PropertyType[NodeS7CommPlus.Property.TAGFILENAME]}`
            );
        }
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////////

    buildAndWriteTagMetaData(cParam, conn_callback, conn_output) {
        let getTagInfoInput = {
            [NodeS7CommPlus.Property.CONNSESSID]: this.connectionSessionID
        }

        NodeS7CommPlus.GET_TAGINFO(getTagInfoInput, (error, output) => {
            if (error) {
                let errOutput = new NodeS7CommPlus.ErrorOutput(
                    NodeS7CommPlus.ErrorOutput.ErrorCode.DRIVERGETTAGINFOERROR,
                    `Error: could not initialize internal tag metadata dictionary, 
                    could not retrieve Tag Information from PLC @ IP ${this.host}, an error occured within the Driver: ${error.message}`,
                    error.stack
                );
                conn_callback(errOutput, undefined);
                return;
            } else {
                if (output[NodeS7CommPlus.Property.GETTAGINFORES] !== 0) {
                    let errOutput = new NodeS7CommPlus.ErrorOutput(
                        NodeS7CommPlus.ErrorOutput.ErrorCode.DRIVERGETTAGINFOERROR,
                        `Error: could not initialize internal tag metadata dictionary,
                        could not retrieve Tag Information from PLC @ IP ${this.host}, Driver Get Tag Info Result Code: ${output[NodeS7CommPlus.Property.GETTAGINFORES]}`,
                        new Error().stack
                    );
                    conn_callback(errOutput, undefined);
                    return;
                }
                
                // build internal tag meta data dictionary (i.e. tagAccessSequence-to-{tagName, tagDatatType} mapping)
                var tagInfoList = output[NodeS7CommPlus.Property.TAGINFO];
                var tagInfoLen = 0;
                const { tagNames, tagAccSeqs, tagDatatypes } = tagInfoList.reduce((acc, item) => {
                    acc.tagNames.push(item.Name);
                    acc.tagAccSeqs.push(item.AccessSequence);
                    acc.tagDatatypes.push(item.Softdatatype);
                    tagInfoLen++;
                    return acc;
                }, {tagNames: [], tagAccSeqs: [], tagDatatypes: [] });
                this.tagMetaDataDict = new Map(
                    tagAccSeqs.map((accseq, index) => 
                        [accseq, {tagName: tagNames[index], tagDatatype: tagDatatypes[index]}] 
                    )
                );

                // write tag file
                const tagFile = path.join(cParam[NodeS7CommPlus.Property.TAGFILEDIR], cParam[NodeS7CommPlus.Property.TAGFILENAME]);
                const fileWriteStream = fs.createWriteStream(tagFile, {flags: 'w'});
                for (let i = 0; i < tagInfoLen; i++) {
                    fileWriteStream.write(`${tagNames[i]}=${tagAccSeqs[i]}\n`);
                }
                fileWriteStream.end();

                // return
                conn_callback(undefined, conn_output);
            }
        });
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////////





    //////////////////////////////////////////////////////////////////////////////////////////////////////
    //                                         CHECK CONNECTION                                  
    //////////////////////////////////////////////////////////////////////////////////////////////////////
    checkConnection(callback) {
        // Provide console feedback
        console.log(`Checking connection to PLC @ IP: ${this.host}`);
        
        // Check if a connection has at least been established to PLC (connection session ID will have been obtained)
        if (!(this.connSessIdObtained)) {
            let checkConnOutput = { [NodeS7CommPlus.Property.CONNSTAT]: false };
            callback(undefined, checkConnOutput);
            return;
        }

        // Initialize Check Connection Input
        let checkConnInput = {
            [NodeS7CommPlus.Property.CONNSESSID]: this.connectionSessionID
        };

        // Check Connection to PLC
        NodeS7CommPlus.CHECK_CONNECTION(checkConnInput, (error, output) => {
            if (error) {
                let errOutput = new NodeS7CommPlus.ErrorOutput(
                    NodeS7CommPlus.ErrorOutput.ErrorCode.DRIVERCHECKCONNERROR,
                    error.message,
                    error.stack
                );
                callback(errOutput, undefined);
                return;
            } else {
                // Update Connection Status
                if (output[NodeS7CommPlus.Property.CONNSTAT] === true) {
                    this.isConnected = true;
                } else {
                    this.isConnected = false;
                }
                callback(undefined, output);
            }
        });
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////////





    //////////////////////////////////////////////////////////////////////////////////////////////////////
    //                                        GET TAG INFORMATION                                  
    //////////////////////////////////////////////////////////////////////////////////////////////////////
    getTagInfo(callback) {
        // Provide console feedback
        console.log(`Getting Tag Information from PLC @ IP: ${this.host}`);

        // Check if a connection to PLC currently exists
        if (!(this.isConnected)) {
            let errOutput = new NodeS7CommPlus.ErrorOutput(
                NodeS7CommPlus.ErrorOutput.ErrorCode.NOCONNERROR,
                `Cannot Retrieve Tag Information, No Connection to PLC @ IP: ${this.host}`,
                new Error().stack
            );
            callback(errOutput, undefined);
            return; 
        }

        // Initialize GetTagInfo Input
        let getTagInfoInput = {
            [NodeS7CommPlus.Property.CONNSESSID]: this.connectionSessionID
        }

        // Get Tag Information from PLC
        NodeS7CommPlus.GET_TAGINFO(getTagInfoInput, (error, output) => {
            if (error) {
                let errOutput = new NodeS7CommPlus.ErrorOutput(
                    NodeS7CommPlus.ErrorOutput.ErrorCode.DRIVERGETTAGINFOERROR,
                    error.message,
                    error.stack
                );
                callback(errOutput, undefined);
                return;
            } else {
                if (output[NodeS7CommPlus.Property.GETTAGINFORES] !== 0) {
                    let errOutput = new NodeS7CommPlus.ErrorOutput(
                        NodeS7CommPlus.ErrorOutput.ErrorCode.DRIVERGETTAGINFOERROR,
                        `Error: Failed to retrieve Tag Information from PLC @ IP ${this.host}, Driver Get Tag Info Result Code: ${output[NodeS7CommPlus.Property.GETTAGINFORES]}`,
                        new Error().stack
                    );
                    callback(errOutput, undefined);
                    return;
                }

                // return GetTagInfo Output
                callback(undefined, output);
            }
        });
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////////
    




    //////////////////////////////////////////////////////////////////////////////////////////////////////
    //                                              READ TAGS                                  
    //////////////////////////////////////////////////////////////////////////////////////////////////////
    readAllItems(callback) {
        var anyReadErrors = false;
        var readOutputObject = {};
        var errOutput = undefined;

        // Provide console feedback
        console.log(`Reading from Tags in PLC @ IP: ${this.host}`);
        
        // Check if a connection to PLC currently exists
        if (!(this.isConnected)) {
            anyReadErrors = true;
            readOutputObject = {};
            errOutput = new NodeS7CommPlus.ErrorOutput(
                NodeS7CommPlus.ErrorOutput.ErrorCode.NOCONNERROR,
                `Cannot Read Tags, No Connection to PLC @ IP: ${this.host}`,
                new Error().stack
            );
            callback(anyReadErrors, readOutputObject, errOutput);
            return;
        }

        // Process Add/Remove array and add or remove items from internal read list
        this.addRemoveArray.forEach((elem) => {
            if (elem.action === NodeS7CommPlus.AddRemoveArrayAction.ADD) {
                this.addItemsNow(elem.arg);
            } else if (elem.action === NodeS7CommPlus.AddRemoveArrayAction.REMOVE) {
                this.removeItemsNow(elem.arg);
            }
        })
        this.addRemoveArray.length = 0;

        // Initialize Read Tag Input 
        let readTagsInput = {
            [NodeS7CommPlus.Property.CONNSESSID]: this.connectionSessionID,
            [NodeS7CommPlus.Property.S7COMMPLUSITEMS]: this.readList
        };

        // Read from Tags in PLC
        NodeS7CommPlus.READTAGS(readTagsInput, (error, output) => {
            if (error) {
                anyReadErrors = true;
                readOutputObject = {};
                errOutput = new NodeS7CommPlus.ErrorOutput(
                    NodeS7CommPlus.ErrorOutput.ErrorCode.DRIVERREADTAGSERROR,
                    error.message,
                    error.stack
                );
                callback(anyReadErrors, readOutputObject, errOutput);
                return;

            } else {
                if (output[NodeS7CommPlus.Property.READRES] !== 0) {
                    anyReadErrors = true;
                    readOutputObject = {};
                    errOutput = new NodeS7CommPlus.ErrorOutput(
                        NodeS7CommPlus.ErrorOutput.ErrorCode.DRIVERREADTAGSERROR,
                        `Error: Failed to read from Tags in PLC @ IP ${this.host}, Driver Read Result Code: ${output[NodeS7CommPlus.Property.READRES]}`,
                        new Error().stack
                    );
                    callback(anyReadErrors, readOutputObject, errOutput);
                    return;
                }

                // overall successfull read operation but check for any single failed reads
                var readValArrLen = output[NodeS7CommPlus.Property.READVALS].length;
                for (let i = 0; i < readValArrLen; i++) {
                    if (output[NodeS7CommPlus.Property.READERRORS][i] === "0") {
                        readOutputObject[this.readList[i].tagAccSeq] = output[NodeS7CommPlus.Property.READVALS][i];
                    } else {
                        anyReadErrors = true;
                        readOutputObject[this.readList[i].tagAccSeq] = NodeS7CommPlus.QualityValue.BAD
                    }
                }

                // return
                callback(anyReadErrors, readOutputObject, undefined);
            }
        });
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////////

    addItems(items) {
        this.addRemoveArray.push({
            arg: items,
            action: NodeS7CommPlus.AddRemoveArrayAction.ADD
        });
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////////

    removeItems(items) {
        this.addRemoveArray.push({
            arg: items,
            action: NodeS7CommPlus.AddRemoveArrayAction.REMOVE
        })
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////////

    addItemsNow(arg) {
        if (Array.isArray(arg)) {
            arg.forEach((tagAccSeq, index) => {
                if (NodeS7CommPlus.GetType(tagAccSeq) !== NodeS7CommPlus.TypeConstant.STRING) {
                    throw new InvalidInputError(
                        `Invalid Input Type: 
                        Element ${index} of Input Tag Access Sequence Array 
                        must be of type ${NodeS7CommPlus.TypeConstant.STRING}`
                    );
                }
                var tagMetaData = this.tagMetaDataDict.get(tagAccSeq);
                if (!tagMetaData) {
                    throw new MissingTagMetaDataError(
                        `Tag Meta Data for Access Sequence ${tagAccSeq} could not be found`
                    );
                }
                this.readList.push(
                    new S7CommPlusItem(
                        tagMetaData.tagName,
                        tagAccSeq,
                        tagMetaData.tagDatatype,
                    )
                );
            });

        } else {
            let tagAccSeq = arg;
            if (NodeS7CommPlus.GetType(tagAccSeq) !== NodeS7CommPlus.TypeConstant.STRING) {
                throw new InvalidInputError(
                    `Invalid Input Type: 
                    Input must be an Access Sequence of type ${NodeS7CommPlus.TypeConstant.STRING}
                    or an array of Access Sequences of type ${NodeS7CommPlus.TypeConstant.STRING}`
                );
            }
            var tagMetaData = this.tagMetaDataDict.get(tagAccSeq);
            if (!tagMetaData) {
                throw new MissingTagMetaDataError(
                    `Tag Meta Data for Access Sequence ${tagAccSeq} could not be found`
                );
            }

            this.readList.push(
                new S7CommPlusItem(
                    tagMetaData.tagName,
                    tagAccSeq,
                    tagMetaData.tagDatatype,
                )
            );
        }
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////////

    removeItemsNow(arg) {
        if (NodeS7CommPlus.GetType(arg) === NodeS7CommPlus.TypeConstant.UNDEFINED) {
            // clear read list
            this.readList.length = 0;

        } else if (Array.isArray(arg)) {
            // handle array case
            arg.forEach((tagAccSeq, index) => {
                if (NodeS7CommPlus.GetType(tagAccSeq) !== NodeS7CommPlus.TypeConstant.STRING) {
                    throw new InvalidInputError(
                        `Invalid Input Type: 
                        Element ${index} of Input Tag Access Sequence Array 
                        must be of type ${NodeS7CommPlus.TypeConstant.STRING}`
                    );
                }
                const remIndex = this.readList.findIndex(s7commplusitem => s7commplusitem.tagAccSeq === tagAccSeq);
                if (remIndex !== -1) {
                    this.readList.splice(remIndex, 1);
                }
            });

        } else {
            //handle singleton case
            if (NodeS7CommPlus.GetType(arg) !== NodeS7CommPlus.TypeConstant.STRING) {
                throw new InvalidInputError(
                    `Invalid Input Type: 
                    Input must be an Access Sequence of type ${NodeS7CommPlus.TypeConstant.STRING}
                    or an array of Access Sequences of type ${NodeS7CommPlus.TypeConstant.STRING}`
                );
            }
            const remIndex = this.readList.findIndex(s7commplusitem => s7commplusitem.tagAccSeq === arg);
            if (remIndex !== -1) {
                this.readList.splice(remIndex, 1);
            }
        }
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////////

    findItem(items) {
        if (NodeS7CommPlus.GetType(items) !== NodeS7CommPlus.TypeConstant.STRING) {
            throw new InvalidInputError(
                `Invalid Input Type: 
                Input must be an Access Sequence of type ${NodeS7CommPlus.TypeConstant.STRING}`
            );
        }

        const index = this.readList.findIndex(s7commplusitem => s7commplusitem.tagAccSeq === items);
        if (index === -1) {
            return undefined;
        }
        return this.readList[index];
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////////





    //////////////////////////////////////////////////////////////////////////////////////////////////////
    //                                              WRITE TAGS                                  
    //////////////////////////////////////////////////////////////////////////////////////////////////////
    writeItems(tagAccSeqs = [], tagWriteVals = [], callback) {
        var anyWriteErrors = false;
        var writeOutputObject = {};
        var errOutput = undefined;
        

        // Provide console feedback
        console.log(`Writing to Tags in PLC @ IP: ${this.host}`);

        // Check if a connection to PLC currently exists
        if (!(this.isConnected)) {
            anyWriteErrors = true;
            writeOutputObject = {};
            errOutput = new NodeS7CommPlus.ErrorOutput(
                NodeS7CommPlus.ErrorOutput.ErrorCode.NOCONNERROR,
                `Cannot Write Tags, No Connection to PLC @ IP: ${this.host}`,
                new Error().stack
            );
            callback(anyWriteErrors, writeOutputObject, errOutput);
            return;

        }

        // Parse Input
        try { this.ParseWriteItemsInput(tagAccSeqs, tagWriteVals) }
        catch (error) {
            anyWriteErrors = true;
            writeOutputObject = {};
            errOutput = new NodeS7CommPlus.ErrorOutput(
                NodeS7CommPlus.ErrorOutput.ErrorCode.INPUTPARSEERROR,
                error.message,
                error.stack
            );
            this.clearWriteLists();
            callback(anyWriteErrors, writeOutputObject, errOutput);
            return;
            
        }

        // Initialize Write Tag Input
        let writeTagsInput = {
            [NodeS7CommPlus.Property.CONNSESSID]: this.connectionSessionID,
            [NodeS7CommPlus.Property.S7COMMPLUSITEMS]: this.writeList
        };

        // Write to tags in PLC
        NodeS7CommPlus.WRITETAGS(writeTagsInput, (error, output) => {
            if (error) {
                anyWriteErrors = true;
                writeOutputObject = {};
                errOutput = new NodeS7CommPlus.ErrorOutput(
                    NodeS7CommPlus.ErrorOutput.ErrorCode.DRIVERWRITETAGSERROR,
                    error.message,
                    error.stack
                );
                this.clearWriteLists();
                callback(anyWriteErrors, writeOutputObject, errOutput);
                return;

            } else {
                if (output[NodeS7CommPlus.Property.WRITERES] !== 0) {
                    anyWriteErrors = true;
                    writeOutputObject = {}
                    errOutput = new NodeS7CommPlus.ErrorOutput(    
                        NodeS7CommPlus.ErrorOutput.ErrorCode.DRIVERWRITETAGSERROR,
                        `Error: Failed to write to Tags in PLC @ IP ${this.host}, Driver Write Result Code: ${output[NodeS7CommPlus.Property.READRES]}`,
                        new Error().stack
                    );
                    callback(anyWriteErrors, writeOutputObject, errOutput);
                    return;
                }

                // overall successful write operation but check for any single failed writes 
                var writeValArrLen = output[NodeS7CommPlus.Property.WRITEVALS].length;
                for (let i = 0; i < writeValArrLen; i++) {
                    if (output[NodeS7CommPlus.Property.WRITEERRORS][i] === "0") {
                        writeOutputObject[this.writeList[i].tagAccSeq] = NodeS7CommPlus.QualityValue.OK;
                    } else {
                        anyWriteErrors = true;
                        writeOutputObject[this.writeList[i].tagAccSeq] = NodeS7CommPlus.QualityValue.BAD;
                    }
                }
                this.clearWriteLists();

                // return 
                callback(anyWriteErrors, writeOutputObject, errOutput);
            }
        });
    } 
    //////////////////////////////////////////////////////////////////////////////////////////////////////

    ParseWriteItemsInput(arg, value) {
        if (Array.isArray(arg) && Array.isArray(value)) {

            // Check if input arrays of equal length
            let arrLen = arg.length;
            if (value.length !== arrLen) {
                throw new InvalidInputError(
                    `Invalid Input: 
                    Arrays of Tag Access Sequences and Write Values must be of equal length`
               );
            }

            // check if each element of input tag access sequence array is of correct type and if so
            // retrieve its corresponding tag Name and tag Data Type and push them along with the write value
            // onto the internal write list
            for (let index = 0; index < arrLen; index++) {
                var tagAccSeq = arg[index];
                var tagWriteVal = value[index];
                if (NodeS7CommPlus.GetType(tagAccSeq) !== NodeS7CommPlus.TypeConstant.STRING) {
                    throw new InvalidInputError(
                        `Invalid Input Type: 
                        Element ${index} of Input Tag Access Sequence Array 
                        must be of type ${NodeS7CommPlus.TypeConstant.STRING}`
                    );
                }
                var tagMetaData = this.tagMetaDataDict.get(tagAccSeq);
                if (!tagMetaData) {
                    throw new MissingTagMetaDataError(
                        `Tag Meta Data for Access Sequence ${tagAccSeq} could not be found`
                    );
                }
                this.writeList.push(
                    new S7CommPlusItem(
                        tagMetaData.tagName,
                        tagAccSeq,
                        tagMetaData.tagDatatype,
                        tagWriteVal
                    )
                );
            }

        } else {
            // handle singleton case
            if (NodeS7CommPlus.GetType(arg) !== NodeS7CommPlus.TypeConstant.STRING) {
                throw new InvalidInputError(
                    `Invalid Input Type: 
                    Input must be an Access Sequence of type ${NodeS7CommPlus.TypeConstant.STRING} and a singleton Write Value
                    or an array of Access Sequences of type ${NodeS7CommPlus.TypeConstant.STRING} and an array of singleton Write Values`
               );
            }
            var tagMetaData = this.tagMetaDataDict.get(arg);
            if (!tagMetaData) {
                throw new MissingTagMetaDataError(
                    `Tag Meta Data for Access Sequence ${arg} could not be found`
                );
            }
            this.writeList.push(
                new S7CommPlusItem(
                    tagMetaData.tagName,
                    arg,
                    tagMetaData.tagDatatype,
                    value
                )
            );
        }
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////////

    clearWriteLists() {
        this.writeList.length = 0;
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////////





    //////////////////////////////////////////////////////////////////////////////////////////////////////
    //                                              DISCONNECT                                  
    //////////////////////////////////////////////////////////////////////////////////////////////////////
    dropConnection(callback) {
        // ensure callback function with valid signature is provided
        if (NodeS7CommPlus.GetType(callback) !== NodeS7CommPlus.TypeConstant.FUNCTION) {
            throw new MissingCallbackError("Callback function with signature (error, output) expected");
        }
        if ((callback.length !== 2)) {
            throw new InvalidCallbackSignatureError("Callback function with signature (error, output) expected");
        }

        // Provide console feedback
        console.log(`Disconnecting from PLC @ IP: ${this.host}`);

        // Check if a connection to PLC currently exists
        if (!(this.isConnected)) {
            let disConnOutput = {[NodeS7CommPlus.Property.CONNDISCONNECTED]: true};
            callback(undefined, disConnOutput);
            return; 
        }

        // Initialize Disonnect Input
        let disConnInput = {
            [NodeS7CommPlus.Property.CONNSESSID]: this.connectionSessionID
        };

        // Disconnect from PLC
        NodeS7CommPlus.DISCONNECT(disConnInput, (error, output) => {
            if (error) {
                let errOutput = new NodeS7CommPlus.ErrorOutput(
                    NodeS7CommPlus.ErrorOutput.ErrorCode.DRIVERDISCONNERROR,
                    error.message,
                    error.stack
                );
                callback(errOutput, undefined);
                return;
            } else {

                // Update Connection Status
                if (output[NodeS7CommPlus.Property.CONNDISCONNECTED] === true) {
                    this.isConnected = false;
                } else {
                    this.isConnected = true;
                }

                // return Disconnect Output
                callback(undefined, output);
            }
        });
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////////

    setTranslationCB() {
        // Do Nothing
        // This function serves no purpose in the S7CommPlus Driver currently,
        // it is only included to allow easier integration into Honcho
    }
}
// END OF NODES7COMMPLUS CLASS //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function doNothing(arg) {
    return arg;
}

class MissingCallbackError extends Error {
    constructor(message) {
        super(message)
        this.name = "MissingCallbackError";
    }
}
class InvalidCallbackSignatureError extends Error {
    constructor(message) {
        super(message)
        this.name = "InvalidCallbackSignature";
    }
}
class InvalidInputError extends Error {
    constructor(message) {
        super(message);
        this.name = "InvalidInputTypeError";
    }
}
class MissingTagMetaDataError extends Error {
    constructor(message) {
        super(message);
        this.name = "MissingTagMetaDataError";
    }
}

class S7CommPlusItem {
    constructor(
        tagName = "",
        tagAccSeq = "",
        tagDataType = -1,
        value = null,
        writeVal = null,
        quality = ""
    ) {
        this.tagName = tagName;
        this.tagAccSeq = tagAccSeq; 
        this.tagDatatype = tagDataType;
        this.value = value;
        this.writeVal = writeVal;
        this.quality = quality;
    }
}

module.exports = NodeS7CommPlus; 