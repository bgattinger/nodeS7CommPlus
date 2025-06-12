using System;
using System.Collections.Generic;
using System.ComponentModel.Design;
using System.Linq;
using System.Net.Mime;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Security;
using System.Threading.Tasks;
using System.Net.Sockets;
using S7CommPlusDriver;
using S7CommPlusDriver.ClientApi;
using System.Net;
using System.IO;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;


namespace S7CommPlusWrapper
{
    public class S7CP
    {

        // Might put these in a dictionary
        private const string CONNRES_PROPERTY = "connRes";
        private const string CONNSESSID_PROPERTY = "connSessID";
        private const string CONNSTAT_PROPERTY = "connStatOK";     
        private const string GETTAGINFORES_PROPERTY = "getTagInfoRes";
        private const string TAGINFO_PROPERTY = "tagInfo";    
        private const string HOST_PROPERTY = "host";
        private const string PASSWORD_PROPERTY = "password";
        private const string TIMEOUT_PROPERTY = "timeout";  
        private const string READRES_PROPERTY = "readRes";
        private const string READVALS_PROPERTY = "readVals";
        private const string READERRORS_PROPERTY = "readErrs";
        private const string WRITERES_PROPERTY = "writeRes";
        private const string WRITEVALS_PROPERTY = "writeVals";
        private const string WRITEERRORS_PROPERTY = "writeErrs";
        private const string S7COMMPLUSITEMS_PROPERTY = "s7CommPlusItems";
        private const string TAGNAME_PROPERTY = "tagName";
        private const string TAGACCSEQ_PROPERTY = "tagAccSeq";
        private const string TAGDATATYPE_PROPERTY = "tagDatatype";
        private const string WRITEVALUE_PROPERTY = "writeVal";
        private const string CONNDISCONNECTED_PROPERTY = "connDisconnected";

        private static Dictionary<UInt32, S7CommPlusConnection> plcConns = new Dictionary<uint, S7CommPlusConnection>();

        private static Dictionary<UInt32, Func<object, object>> dataConversionDict = new Dictionary<uint, Func<object, object>>() 
        {
            { 1, input => Convert.ToBoolean(input) },
            { 2, input => Convert.ToByte(input) },
            { 3, input => Convert.ToChar(input) },
            { 4, input => Convert.ToUInt16(input) },
            { 5, input => Convert.ToInt16(input) },
            { 6, input => Convert.ToUInt32(input) },
            { 7, input => Convert.ToInt32(input) },
            { 8, input => Convert.ToSingle(input) },
            { 9, input => Convert.ToDateTime(input) },
            { 10, input => Convert.ToUInt32(input) },
            { 11, input => Convert.ToInt32(input) },
            { 12, input => Convert.ToUInt16(input) },
            { 14, input => Convert.ToDateTime(input) },
            { 19, input => Convert.ToString(input) },
            { 20, input => input is string str ? Encoding.UTF8.GetBytes(str) : input as byte[] ?? throw new InvalidCastException("Cannot convert to byte array") },
            { 22, input => input is string str ? Encoding.UTF8.GetBytes(str) : input as byte[] ?? throw new InvalidCastException("Cannot convert to byte array") },
            { 48, input => Convert.ToDouble(input) },
            { 49, input => Convert.ToUInt64(input) },
            { 50, input => Convert.ToInt64(input) },
            { 51, input => Convert.ToUInt64(input) },
            { 52, input => Convert.ToSByte(input) },
            { 53, input => Convert.ToUInt16(input) },
            { 54, input => Convert.ToUInt32(input) },
            { 55, input => Convert.ToSByte(input) },
            { 61, input => Convert.ToChar(input) },
            { 62, input => Convert.ToString(input) },
            { 64, input => Convert.ToInt64(input) },
            { 65, input => Convert.ToUInt64(input) },
            { 66, input => Convert.ToUInt64(input) },
            { 67, input => Convert.ToDateTime(input) },
        };

        private static Dictionary<UInt32, PropertyInfo> PlcTagValueProperty =
            new Dictionary<UInt32, PropertyInfo>
            {
                { 1, typeof(PlcTagBool).GetProperty("Value") },
                { 2, typeof(PlcTagByte).GetProperty("Value") },
                { 3, typeof(PlcTagChar).GetProperty("Value") },
                { 4, typeof(PlcTagWord).GetProperty("Value") },
                { 5, typeof(PlcTagInt).GetProperty("Value") },
                { 6, typeof(PlcTagDWord).GetProperty("Value") },
                { 7, typeof(PlcTagDInt).GetProperty("Value") },
                { 8, typeof(PlcTagReal).GetProperty("Value") },
                { 9, typeof(PlcTagDate).GetProperty("Value") },
                { 10, typeof(PlcTagTimeOfDay).GetProperty("Value") },
                { 11, typeof(PlcTagTime).GetProperty("Value") },
                { 12, typeof(PlcTagS5Time).GetProperty("Value") },
                { 14, typeof(PlcTagDateAndTime).GetProperty("Value") },
                { 19, typeof(PlcTagString).GetProperty("Value") },
                { 20, typeof(PlcTagPointer).GetProperty("Value") },
                { 22, typeof(PlcTagAny).GetProperty("Value") },
                { 48, typeof(PlcTagLReal).GetProperty("Value") },
                { 49, typeof(PlcTagULInt).GetProperty("Value") },
                { 50, typeof(PlcTagLInt).GetProperty("Value") },
                { 51, typeof(PlcTagLWord).GetProperty("Value") },
                { 52, typeof(PlcTagUSInt).GetProperty("Value") },
                { 53, typeof(PlcTagUInt).GetProperty("Value") },
                { 54, typeof(PlcTagUDInt).GetProperty("Value") },
                { 55, typeof(PlcTagSInt).GetProperty("Value") },
                { 61, typeof(PlcTagWChar).GetProperty("Value") },
                { 62, typeof(PlcTagWString).GetProperty("Value") },
                { 64, typeof(PlcTagLTime).GetProperty("Value") },
                { 65, typeof(PlcTagLTOD).GetProperty("Value") },
                { 66, typeof(PlcTagLDT).GetProperty("Value") },
                { 67, typeof(PlcTagDTL).GetProperty("Value") },
            };
        private static object GetValue(PlcTag tag) {
            if (PlcTagValueProperty.TryGetValue(tag.Datatype, out var valProp)) {
                return valProp.GetValue(tag);
            } // else
            throw new ArgumentException($"Unknown PlcTag type: {tag.GetType()}");
        }
        private static void SetValue(PlcTag tag, object newVal) {
            if (PlcTagValueProperty.TryGetValue(tag.Datatype, out var valProp)) {
                valProp.SetValue(tag, newVal);
                return;
            } // else
            throw new ArgumentException($"Unknown PlcTag type: {tag.GetType()}");
        }

        // DEV NOTE: Want to add error code dictionary










        //////////////////////////////////////////////////////////////////////////////////////////////////////
        //                                       CONNECT                               
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        public async Task<object> Connect(dynamic input) {
            // Initialize output object
            var connOut = new Dictionary<string, object> {
                { CONNRES_PROPERTY, -1 },
                { CONNSESSID_PROPERTY, 0 }
            };

            // Parse input object
            connParams connIn = ParseInput_ConnectionParameters(input);

            // Attempt to connect to target plc
            S7CommPlusConnection conn = new S7CommPlusConnection();
            connOut[CONNRES_PROPERTY] = await Task.Run(
                () => conn.Connect(
                    connIn.ipAddress,
                    connIn.password,
                    connIn.timeout
                )
            );
            if ((int)connOut[CONNRES_PROPERTY] == 0) {
                connOut[CONNSESSID_PROPERTY] = conn.SessionId2;
                if (plcConns.ContainsKey((UInt32)connOut[CONNSESSID_PROPERTY])) {
                    plcConns[(UInt32)connOut[CONNSESSID_PROPERTY]] = conn;
                } else {
                    plcConns.Add((UInt32)connOut[CONNSESSID_PROPERTY], conn);
                }
            }

            return (object)connOut;
        }
        //////////////////////////////////////////////////////////////////////////////////////////////////////










        //////////////////////////////////////////////////////////////////////////////////////////////////////
        //                                       CHECK CONNECTION                                  
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        public async Task<object> CheckConnection(dynamic input) {
            // Initialize output object
            var checkConnOut = new Dictionary<string, object> {
                [CONNSTAT_PROPERTY] = false
            };

            // Parse input object
            S7CommPlusConnection conn = ParseInput_S7CPConnection(input);

            // check connection by performing a pseduo read
            var psuedoReadRes = -1;
            List<object> pseudoReadVals = new List<object>();
            List<ulong> pseudoReadErrors = new List<ulong>();
            psuedoReadRes = await Task.Run(
                () => conn.ReadValues(
                    new List<ItemAddress>(), 
                    out pseudoReadVals, 
                    out pseudoReadErrors)
            );
            if (psuedoReadRes == 0) {
                checkConnOut[CONNSTAT_PROPERTY] = true;
            }

            return checkConnOut;
        }
        //////////////////////////////////////////////////////////////////////////////////////////////////////









        
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        //                                              GET TAG INFORMATION                                  
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        public async Task<object> GetTagInfo(dynamic input) {
            // Initialize output object
            var getTagInfoOut = new Dictionary<string, object> {
                [GETTAGINFORES_PROPERTY] = -1,
                [TAGINFO_PROPERTY] = new List<VarInfo>()
            };

            // Parse input object
            S7CommPlusConnection conn = ParseInput_S7CPConnection(input);
            
            // Get Tag Information from PLC
            List<VarInfo> tempTags = new List<VarInfo>();
            getTagInfoOut[GETTAGINFORES_PROPERTY] = await Task.Run(() => conn.Browse(out tempTags));
            getTagInfoOut[TAGINFO_PROPERTY] = tempTags;

            return getTagInfoOut;
        }
        //////////////////////////////////////////////////////////////////////////////////////////////////////










        //////////////////////////////////////////////////////////////////////////////////////////////////////
        //                                              TAG READING                               
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        public async Task<object> ReadTags(dynamic input) {
            // Initialize output object
            var readTagsOut = new Dictionary<string, object> {
                [READRES_PROPERTY] = -1,
                [READVALS_PROPERTY] = new List<object>(),
                [READERRORS_PROPERTY] = new List<UInt64>()
            };

            // Parse input object
            readTagParams readTagsIn = ParseInput_ReadTagParameters(input);
            S7CommPlusConnection conn = readTagsIn.conn;
            List<PlcTag> readTags = readTagsIn.readTags;

            // Invoke S7CommPlusDriver to Read Tags
            readTagsOut[READRES_PROPERTY] = await Task.Run(
                () => PlcTags.ReadTags(
                    conn,
                    readTags
                )
            );

            // Pack read values into output object
            List<object> values = new List<object>();
            List<UInt64> errors = new List<UInt64>();
            foreach (PlcTag tag in readTags) {
                values.Add(GetValue(tag));
                errors.Add(tag.LastReadError);
            }
            readTagsOut[READVALS_PROPERTY] = values;
            readTagsOut[READERRORS_PROPERTY] = errors;

            return readTagsOut;
        }
        //////////////////////////////////////////////////////////////////////////////////////////////////////










        //////////////////////////////////////////////////////////////////////////////////////////////////////
        //                                              TAG WRITING                               
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        public async Task<object> WriteTags(dynamic input) {
            // Initialize output object
            var writeTagsOut = new Dictionary<string, object> {
                [WRITERES_PROPERTY] = -1,
                [WRITEVALS_PROPERTY] = new List<object>(),
                [WRITEERRORS_PROPERTY] = new List<UInt64>()
            };

            // Parse input object
            writeTagParams writeTagsIn = ParseInput_WriteTagParameters(input);
            S7CommPlusConnection conn = writeTagsIn.conn;
            List<PlcTag> writeTags = writeTagsIn.writeTags;

            // Invoke S7CommPlusDriver to Read Tags
            writeTagsOut[WRITERES_PROPERTY] = await Task.Run(
                () => PlcTags.WriteTags(
                    conn,
                    writeTags
                )
            );

            List<object> values = new List<object>();
            List<UInt64> errors = new List<UInt64>();
            foreach (var tag in writeTags) {
                values.Add(GetValue(tag));
                errors.Add(tag.LastWriteError);
            }
            writeTagsOut[WRITEVALS_PROPERTY] = values;
            writeTagsOut[WRITEERRORS_PROPERTY] = errors;
            return writeTagsOut;
        }
        //////////////////////////////////////////////////////////////////////////////////////////////////////










        //////////////////////////////////////////////////////////////////////////////////////////////////////
        //                                              DISCONNECT                                  
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        public async Task<object> Disconnect(dynamic input) {
            // Initialize ouput object
            var disConnOut = new Dictionary<string, object> {
                {CONNDISCONNECTED_PROPERTY, false}
            };

            // Parse input object
            S7CommPlusConnection conn = ParseInput_S7CPConnection(input);

            // disconnect PLC connection
            await Task.Run(() => conn.Disconnect());
            plcConns.Remove(conn.SessionId2);
            disConnOut[CONNDISCONNECTED_PROPERTY] = true;
            return (object)disConnOut;
        }
        //////////////////////////////////////////////////////////////////////////////////////////////////////










        //////////////////////////////////////////////////////////////////////////////////////////////////////
        //                                              INPUT PARSING                                  
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        private class connParams 
        {
            public string ipAddress { get; set; }
            public string password { get; set; }
            public int timeout { get; set; }

            public connParams(string ipAddress = "0.0.0.0", string password = "", int timeout = 5000) {
                this.ipAddress = ipAddress;
                this.password = password;
                this.timeout = timeout;
            }
        }
        private connParams ParseInput_ConnectionParameters(dynamic input_) {
            // check if input is of expected edge-js marshalled data type
            if ( !(input_ is IDictionary<string, object> input)) {
                throw new InvalidCastException("Input must be a dictionary-like object");
            }

            // Initialize Conenction Parameters object to Parse input into
            connParams connIn = new connParams();

            // Parse HOST_PROPERTY
            if (!input.ContainsKey(HOST_PROPERTY) || input[HOST_PROPERTY] == null) {
                throw new ArgumentException($"Missing required property: {HOST_PROPERTY}");
            }
            connIn.ipAddress = input[HOST_PROPERTY].ToString();

            // Parse PASSWORD_PROPERTY
            if (!input.ContainsKey(PASSWORD_PROPERTY) || input[PASSWORD_PROPERTY] == null) {
                throw new ArgumentException($"Missing required property: {PASSWORD_PROPERTY}");
            }
            connIn.password = input[PASSWORD_PROPERTY].ToString();

            // Parse TIMEOUT_PROPERTY
            if (!input.ContainsKey(TIMEOUT_PROPERTY) || input[TIMEOUT_PROPERTY] == null) {
                throw new ArgumentException($"Missing required property: {TIMEOUT_PROPERTY}");
            }
            if (!int.TryParse(input[TIMEOUT_PROPERTY]?.ToString(), out int temp)) {
                throw new ArgumentException($"Missing or invalid property: {TIMEOUT_PROPERTY}");
            }
            connIn.timeout = temp;

            return connIn;
        }
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        private S7CommPlusConnection ParseInput_S7CPConnection(dynamic input_) {
            if (!(input_ is IDictionary<string, object> input)) {
                throw new InvalidCastException("Input must be a dictionary-like object");
            }

            // Initialize S7CommPlus Conenction object to be returned
            S7CommPlusConnection conn = null;

            // Parse CONNSESSID_PROPERTY
            if (!input.ContainsKey(CONNSESSID_PROPERTY) || input[CONNSESSID_PROPERTY] == null) {
                throw new ArgumentException($"Missing required property: {CONNSESSID_PROPERTY}");
            }
            if (!UInt32.TryParse(input[CONNSESSID_PROPERTY]?.ToString(), out uint targetConnSessID)) {
                throw new ArgumentException($"{CONNSESSID_PROPERTY} must be a valid unsigned integer.");
            }

            // Check if the connection session ID exists in plcConns
            if (!plcConns.ContainsKey(targetConnSessID)) {
                throw new KeyNotFoundException($"{CONNSESSID_PROPERTY} does not exist.");
            }

            conn = plcConns[targetConnSessID];

            return conn;
        }
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        private class readTagParams
        {
            public S7CommPlusConnection conn { get; set; }
            public List<PlcTag> readTags { get; set; }

            public readTagParams(S7CommPlusConnection conn = null, List<PlcTag> readTags = null) {
                this.conn = conn ?? new S7CommPlusConnection();
                this.readTags = readTags ?? new List<PlcTag>();
            }
        }
        private readTagParams ParseInput_ReadTagParameters(dynamic input_) {
            if (!(input_ is IDictionary<string, object> input)) {
                throw new InvalidCastException("Input must be a dictionary-like object");
            }

            // Initialize ReadTags Parameters Object to Parse input into
            readTagParams readTagsIn = new readTagParams();

            // Parse CONNSESSID_PROPERTY
            if (!input.ContainsKey(CONNSESSID_PROPERTY) || input[CONNSESSID_PROPERTY] == null) {
                throw new ArgumentException($"Missing required property: {CONNSESSID_PROPERTY}");
            }
            if (!UInt32.TryParse(input[CONNSESSID_PROPERTY]?.ToString(), out uint targetConnSessID)) {
                throw new ArgumentException($"{CONNSESSID_PROPERTY} must be a valid unsigned integer.");
            }
            if (!plcConns.ContainsKey(targetConnSessID)) {
                throw new KeyNotFoundException($"{CONNSESSID_PROPERTY} does not exist.");
            }
            readTagsIn.conn = plcConns[targetConnSessID];

            // Parse TAGS_PROPERTY
            if (!input.ContainsKey(S7COMMPLUSITEMS_PROPERTY) || input[S7COMMPLUSITEMS_PROPERTY] == null) {
                throw new ArgumentException($"Missing required property: {S7COMMPLUSITEMS_PROPERTY}");
            }
            if (!(input[S7COMMPLUSITEMS_PROPERTY] is IEnumerable<object> s7cpItemList)) {
                throw new ArgumentException($"Property {S7COMMPLUSITEMS_PROPERTY} is expected to be an array");
            }
            foreach (var s7cpItem in s7cpItemList) {
                if (!(s7cpItem is IDictionary<string, object> tagDict)) {
                    throw new ArgumentException($"Each element of {S7COMMPLUSITEMS_PROPERTY} is expected to be an object");
                }

                // Parse TAGNAME_PROPERTY from current S7CommPlusItem Element
                if (!tagDict.ContainsKey(TAGNAME_PROPERTY) || tagDict[TAGNAME_PROPERTY] == null) {
                    throw new ArgumentException($"{TAGNAME_PROPERTY} is required");
                }
                string tagName = tagDict[TAGNAME_PROPERTY].ToString();

                // Parse TAGACCSEQ_PROPERTY from current S7CommPlusItem  Element
                if (!tagDict.ContainsKey(TAGACCSEQ_PROPERTY) || tagDict[TAGACCSEQ_PROPERTY] == null) {
                    throw new ArgumentException($"{TAGACCSEQ_PROPERTY} is required");
                }
                string tagAccSeq = tagDict[TAGACCSEQ_PROPERTY].ToString();

                // Parse TAGDATATYPE_PROPERTY from current S7CommPlusItem Element
                if (!tagDict.ContainsKey(TAGDATATYPE_PROPERTY) || tagDict[TAGDATATYPE_PROPERTY] == null) {
                    throw new ArgumentException($"{TAGDATATYPE_PROPERTY} is required and should be a number");
                }
                if (!UInt32.TryParse(tagDict[TAGDATATYPE_PROPERTY]?.ToString(), out UInt32 tagDataType)) {
                    throw new ArgumentException($"{TAGDATATYPE_PROPERTY} is required and should be a valid number");
                }

                // Add the parsed tag to the collection
                readTagsIn.readTags.Add(PlcTags.TagFactory(tagName, new ItemAddress(tagAccSeq), tagDataType));
            }

            return readTagsIn;
        }

        //////////////////////////////////////////////////////////////////////////////////////////////////////

        private class writeTagParams 
        {
            public S7CommPlusConnection conn { get; set; }
            public List<PlcTag> writeTags  { get; set; }

            public writeTagParams(S7CommPlusConnection conn = null, List<PlcTag> readTags = null) {
                this.conn = conn ?? new S7CommPlusConnection();
                this.writeTags = readTags ?? new List<PlcTag>();
            }
        }
        private writeTagParams ParseInput_WriteTagParameters(dynamic input_) {
            // Ensure the dynamic input is a dictionary-like object
            if (!(input_ is IDictionary<string, object> input)) {
                throw new ArgumentException("Input must be a dictionary-like object.");
            }

            // Initialize WriteTags Parameters Object to Parse input into
            writeTagParams writeTagsIn = new writeTagParams();

            // Parse CONNSESSID_PROPERTY
            if (!input.ContainsKey(CONNSESSID_PROPERTY) || input[CONNSESSID_PROPERTY] == null) {
                throw new ArgumentException($"Missing required property: {CONNSESSID_PROPERTY}");
            }
            if (!UInt32.TryParse(input[CONNSESSID_PROPERTY]?.ToString(), out uint targetConnSessID)) {
                throw new ArgumentException($"{CONNSESSID_PROPERTY} must be a valid unsigned integer.");
            }
            if (!plcConns.ContainsKey(targetConnSessID)) {
                throw new Exception($"{CONNSESSID_PROPERTY} does not exist");
            }
            writeTagsIn.conn = plcConns[targetConnSessID];

            // Parse TAGS_PROPERTY
            if (!input.ContainsKey(S7COMMPLUSITEMS_PROPERTY) || input[S7COMMPLUSITEMS_PROPERTY] == null) {
                throw new ArgumentException($"Missing required property: {S7COMMPLUSITEMS_PROPERTY}");
            }
            if (!(input[S7COMMPLUSITEMS_PROPERTY] is IEnumerable<object> tagsList)) {
                throw new ArgumentException($"Property {S7COMMPLUSITEMS_PROPERTY} is expected to be an array");
            }
            foreach (var tagObj in tagsList) {
                if (!(tagObj is IDictionary<string, object> tagDict)) {
                    throw new ArgumentException($"Each element of {S7COMMPLUSITEMS_PROPERTY} is expected to be an object");
                }

                // Parse TAGNAME_PROPERTY
                if (!tagDict.ContainsKey(TAGNAME_PROPERTY) || tagDict[TAGNAME_PROPERTY] == null) {
                    throw new ArgumentException($"{TAGNAME_PROPERTY} is required");
                }
                string tagName = tagDict[TAGNAME_PROPERTY].ToString();

                // Parse TAGACCSEQ_PROPERTY
                if (!tagDict.ContainsKey(TAGACCSEQ_PROPERTY) || tagDict[TAGACCSEQ_PROPERTY] == null) {
                    throw new ArgumentException($"{TAGACCSEQ_PROPERTY} is required");
                }
                string tagAccSeq = tagDict[TAGACCSEQ_PROPERTY].ToString();

                // Parse TAGDATATYPE_PROPERTY
                if (!tagDict.ContainsKey(TAGDATATYPE_PROPERTY) || tagDict[TAGDATATYPE_PROPERTY] == null) {
                    throw new ArgumentException($"{TAGDATATYPE_PROPERTY} is required and should be a number");
                }
                if (!UInt32.TryParse(tagDict[TAGDATATYPE_PROPERTY]?.ToString(), out uint tagDataType)) {
                    throw new ArgumentException($"{TAGDATATYPE_PROPERTY} is required and should be a valid number");
                }

                PlcTag writeTag = PlcTags.TagFactory(tagName, new ItemAddress(tagAccSeq), tagDataType);

                // Handle tag write value based on its data type
                object tagValue;
                if (dataConversionDict.TryGetValue(tagDataType, out var converter)) {
                    if (tagDict.ContainsKey(WRITEVALUE_PROPERTY) && tagDict[WRITEVALUE_PROPERTY] != null) {
                        tagValue = converter(tagDict[WRITEVALUE_PROPERTY]);
                    } else {
                        throw new ArgumentException($"{WRITEVALUE_PROPERTY} is required");
                    }
                } else {
                    throw new ArgumentException($"Unrecognized Data Type Encountered in {TAGDATATYPE_PROPERTY}");
                }

                // Set the value for the tag
                SetValue(writeTag, tagValue);

                // Add to the collection
                writeTagsIn.writeTags.Add(writeTag);
            }

            return writeTagsIn;
        }
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        ///
    }
}