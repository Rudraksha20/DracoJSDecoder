var Header = {
    draco_string : new Int8Array(5),
    version_major : new Uint8Array(1),
    version_minor : new Uint8Array(1),
    encoder_type : new Uint8Array(1),
    encoder_method : new Uint8Array(1),
    flags : new Uint16Array(1)
}

function DecodeHeaderDRACOString(buffer, Header, data_size, position, size) {
    if(data_size < position.pos + size) {
        return false;
    }

    var result = "";
    for(let i = position.pos; i < position.pos + size; i++) {
        result += String.fromCharCode(buffer.slice(i,i+1)[0]);
    }
    Header.draco_string = result;
    position.pos += size;
    return true;
}

function DecodeValue(buffer, out_value, data_size, position, size, attribute_name) {
    if(data_size < position.pos + size) {
        return false;
    }

    let temp = new Uint8Array(size);

    for(let i = position.pos, j = (size -1); i < position.pos + size; i++, j--) {
        temp[j] = buffer.slice(i, i+1)[0];
    }

    for(let k = 0; k < size; k++) {
        out_value[attribute_name][0] <<= (8*k);
        out_value[attribute_name][0] |= temp[k];
    }
    
    position.pos += size;
    return true;
}

// Currently, we support point cloud and triangular mesh encoding.
// TODO(scottgodfrey) convert enum to enum class (safety, not performance).
var EncodedGeometryType = {
    INVALID_GEOMETRY_TYPE   :  -1,
    POINT_CLOUD             :   0,
    TRIANGULAR_MESH         :   1
};

// List of encoding methods for meshes.
var MeshEncoderMethod = {
    MESH_SEQUENTIAL_ENCODING : 0,
    MESH_EDGEBREAKER_ENCODING: 1
};

// For backwards compatibility
if(Object.freeze) {
    Object.freeze(EncodedGeometryType);
}

// Global variable for iterating over the buffer
var position = {
    pos : 0
};

// Check if the input encoder type is valid
function CheckEncoderType(input_encoder_type) {
    if(input_encoder_type == EncodedGeometryType.POINT_CLOUD) {
        return true;
    } else if(input_encoder_type == EncodedGeometryType.TRIANGULAR_MESH) {
        return true;
    } else {
        return false;
    }
}

// Latest Draco bistream version
var kDracoBitstreamVersionMajor = new Uint8Array(1);
kDracoBitstreamVersionMajor[0] = 2;
var kDracoBitstreamVersionMinor = new Uint8Array(1);
kDracoBitstreamVersionMinor[0] = 2;

// Draco bit stream version. Converting from Uint8Array to Uint16Array
function DracoBitstreamVersion(v1, v2) {
    return ((v1 << 8) | v2);
}

// Flag mask used to validate the metadata in the input buffer
var METADATA_FLAG_MASK = 0x8000;

function BufferDecode(in_value, position) {
    return true;
}

// Decodes a specified integer as varint. Note that the in type must be the
// same as the one used in the corresponding EncodeVarint() call.
function DecodeVarint(position, out_value, buffer, data_size, attribute_name, unsigned) {
    if(unsigned) {  
        // Coding of unsigned values.
        // 0-6 bit - data
        // 7 bit - next byte?

        var in_value = {
            in_val : new Uint8Array(1)
        };

        if(!DecodeValue(buffer, in_value, data_size, position, in_value.in_val.BYTES_PER_ELEMENT, 'in_val')) {
            return false;
        }

        if(in_value.in_val & (1 << 7)) {
            // Next byte is available, decode it first
            if(!DecodeVarint(position, out_value, buffer, data_size, attribute_name, unsigned)) {
                return false;
            }
            // Append decoded info from this byte.
            out_value[attribute_name] <<= 7;
            out_value[attribute_name] |= in_value.in_val & ((1 << 7) - 1);
        } else {
            // Last byte reached
            out_value[attribute_name] = in_value.in_val;
        }

    } else {
        // Input is a signed value. Decode the symbol and convert to signed.
        // Temp convert signed to unsigned value
        var temp_out_val = {
            val
        }
        if(out_value[attribute_name].BYTES_PER_ELEMENT == 1) {
            temp_out_val.val = new Uint8Array(1);
        } else if(out_value[attribute_name].BYTES_PER_ELEMENT == 2) {
            temp_out_val.val = new Uint16Array(1);
        } else if(out_value[attribute_name].BYTES_PER_ELEMENT == 4) {
            temp_out_val.val = new Uint32Array(1);
        }

        if(!DecodeVarint(position, temp_out_val, buffer, data_size, 'val', true)) {
            return false;
        }

        if(out_value[attribute_name].BYTES_PER_ELEMENT == 1) {
            out_value[attribute_name] = new Int8Array(temp_out_val.val);
        } else if(out_value[attribute_name].BYTES_PER_ELEMENT == 2) {
            out_value[attribute_name] = new Int16Array(temp_out_val.val);
        } else if(out_value[attribute_name].BYTES_PER_ELEMENT == 4) {
            out_value[attribute_name] = new Int32Array(temp_out_val.val);
        }

    }
    return true;
}

// Mesh Class
var Mesh = {
    mesh : new Array()
}

module.exports = {
    Header                      : Header,
    DecodeHeaderDRACOString     : DecodeHeaderDRACOString,
    DecodeValue                 : DecodeValue,
    EncodedGeometryType         : EncodedGeometryType,
    MeshEncoderMethod           : MeshEncoderMethod,
    CheckEncoderType            : CheckEncoderType,
    kDracoBitstreamVersionMajor : kDracoBitstreamVersionMajor,
    kDracoBitstreamVersionMinor : kDracoBitstreamVersionMinor,
    DracoBitstreamVersion       : DracoBitstreamVersion,
    METADATA_FLAG_MASK          : METADATA_FLAG_MASK,
    position                    : position,
    DecodeVarint                : DecodeVarint,
    Mesh                        : Mesh        
}