var {DecodeValue} = require('./draco_utility.js');
var {EncodedGeometryType} = require(`./draco_utility.js`);
var {MeshEncoderMethod} = require(`./draco_utility.js`);
var {CheckEncoderType} = require('./draco_utility.js');
var {kDracoBitstreamVersionMajor} = require('./draco_utility.js');
var {kDracoBitstreamVersionMinor} = require('./draco_utility.js');
var {DracoBitstreamVersion} = require('./draco_utility.js');
var {METADATA_FLAG_MASK} = require('./draco_utility.js');
var {position} = require('./draco_utility.js');
var {DecodeVarint} = require('./draco_utility.js');
var {Header} = require('./draco_utility.js');
var {DecodeHeaderDRACOString} = require('./draco_utility.js');
var {Mesh} = require('./draco_utility.js');

function DecoderBuffer(buffer, data_size) {
    this.buffer = buffer;
    this.data_size = data_size;
    this.bitstream_version = new Uint16Array(1);
    this.num_faces;
    this.num_points;

    this.SetBitstreamVersion = function(version_major, version_minor) {
        this.bitstream_version[0] = DracoBitstreamVersion(version_major, version_minor);
    }

    this.DecodeSequentialConnectivityData = function() {
        // Parse sequential connectivity data
        var number_of_faces = {
            num_faces : new Uint32Array(1)
        };
        var number_of_points = {
            num_points : new Uint32Array(1)
        };

        // Backwards compatibility
        if(this.bitstream_version < DracoBitstreamVersion(2, 2)) {
            if(DecodeValue(buffer, number_of_faces, data_size, position, 1, 'num_faces')) {
                console.log("Error: Error while decoding the num_faces value");
                return false;
            }
            if(DecodeValue(buffer, number_of_points, data_size, position, 1, 'num_points')) {
                console.log("Error: Error while decoding num_points value");
                return false;
            }
        }

        if(!DecodeVarint(position, number_of_faces, this.buffer, data_size, 'num_faces', true)) {
            console.log("Error: Error while decoding the num_faces value");
            return false;
        }
        if(!DecodeVarint(position, number_of_points, this.buffer, data_size, 'num_points', true)) {
            console.log("Error: Error while decoding num_points value");
            return false;
        }

        // TODO: Check that num_faces and num_points are valid values
        // This needs a support fro 64 bit numbers in JS.

        // Store the number of faces and number of points value
        this.num_faces = number_of_faces.num_faces;
        this.num_points = number_of_points.num_points;

        // Decode the connectivity method
        var connect_method = {
            connectivity_method : new Uint8Array(1)
        }
        
        if(!DecodeValue(buffer, connect_method, data_size, position, connect_method.connectivity_method.BYTES_PER_ELEMENT, 'connectivity_method')) {
            console.log("Error: Error while decoding connectivity method");
            return false;
        }

        if(connect_method.connectivity_method == 0) {
            if(!this.DecodeAndDecompressIndices(number_of_faces)) {
                console.log("Error: Error while decoding and decompressing indices");
                return false;
            }
        } else {
            // Decode sequential indices
            if(number_of_points.num_points < 256) {
                // Decode indices as Uint8Array
                for(let i = 0; i < number_of_faces.num_faces; i++) {
                    var face = new Array(new Uint32Array(1), new Uint32Array(1), new Uint32Array(1));
                    for(let j = 0; j < 3; j++) {
                        var temp_val =  {
                            val : new Uint8Array(1)
                        }
                        if(!DecodeValue(this.buffer, temp_val, data_size, position, 1, 'val')) {
                            console.log("Error: Error while decoding sequential indices");
                            return false;
                        }
                        face[j] = new Uint32Array(temp_val.val);
                    }
                    Mesh.mesh[i] = face;
                }
            } else if (number_of_points.num_points < (1 << 16)) {
                // Decode indices as Uint16Array
                debugger;
                for(let i = 0; i < number_of_faces.num_faces; i++) {
                    var face = new Array(new Uint32Array(1), new Uint32Array(1), new Uint32Array(1));
                    for(let j = 0; j < 3; j++) {
                        var temp_val = {
                            val : new Uint16Array(1)
                        }
                        if(!DecodeValue(this.buffer, temp_val, data_size, position, temp_val.val.BYTES_PER_ELEMENT, 'val')) {
                            console.log("Error: Error while decoding sequential indices");
                            return false;
                        }
                        face[j] = new Uint32Array(temp_val.val);
                    }
                    Mesh.mesh[i] = face;
                }
            } else if(number_of_points.num_points < (1 << 21) && this.bitstream_version[0] >= DracoBitstreamVersion(2,2)) {
                // Decode indices as Uint32Array
                for(let i = 0; i < number_of_faces.num_faces; i++) {
                    var face = new Array(new Uint32Array(1), new Uint32Array(1), new Uint32Array(1));
                    for(let j = 0; j < 3; j++) {
                        var temp_val = {
                            val : new Uint32Array(1)
                        }
                        if(!DecodeValue(this.buffer, temp_val, data_size, position, 1, 'val')) {
                            console.log("Error: Error while decoding sequential indices");
                            return false;
                        }
                        face[j] = temp_val.val;
                    }
                    Mesh.mesh[i] = face;
                }
            } else {
                // Decode mesh as Uint32Array (Default)
                for(let i = 0; i < number_of_faces.num_faces; i++) {
                    var face = new Array(new Uint32Array(1), new Uint32Array(1), new Uint32Array(1));
                    for(let j = 0; j < 3; j++) {
                        var temp_val = {
                            val : new Uint32Array(1)
                        }
                        if(!DecodeValue(this.buffer, temp_val, data_size, position, 1, 'val')) {
                            console.log("Error: Error while decoding sequential indices");
                            return false;
                        }
                        face[j] = temp_val.val;
                    }
                    Mesh.mesh[i] = face;
                }
            }
        }

        return true;
    }

    this.DecodeAndDecompressIndices = function(number_of_faces) {
        // Get decoded indices differences that were encoded with an entropy code.
        // Indices buffer
        var ind_buffer = {
            indices_buffer : new Array(number_of_faces.num_faces * 3)
        }
        // TODO: Try and remove this initialization if possible
        for(let i = 0 ; i < ind_buffer.indices_buffer.length; i++) {
            ind_buffer.indices_buffer[i] = new Uint32Array(1);
        }
    
        // TODO rest of the decoding and decompressing

        return true;
    }

    this.DecodeEdgebreakerConnectivityData = function() {
        return true;
    }

    // Decoding the connectivity data
    this.DecodeConnectivity = function() {
        // Check which type of encoding is performed
        if(Header.encoder_method == MeshEncoderMethod.MESH_SEQUENTIAL_ENCODING) {
            if(!this.DecodeSequentialConnectivityData()) {
                console.log("Error: Error while parsing sequential connectivity data");
                return false;
            }
        }
        if(Header.encoder_method == MeshEncoderMethod.MESH_EDGEBREAKER_ENCODING) {
            if(!this.DecodeEdgebreakerConnectivityData()) {
                console.log("Error while parsing edgebreaker connectivity data");
                return false;
            }
        }
        return true;
    } 

}

function Decoder(input_file, output_file) {
    this.input_file_location = input_file;
    this.output_file_location = output_file;

    // Decoding variables
    var decode_buffer;

    // Decoding methods
    var mesh_sequential_encoding;
    var mesh_edgebreaker_encoding;
    
    // Create an instance of decode buffer and save the buffer in it
    this.CreateDecodeBuffer = function(buffer, size) {
        decode_buffer = new DecoderBuffer(buffer, size);
    }

    // Create and decode the header
    this.DecodeHeader = function () {
        // Verify that it is a Draco file
        if(!DecodeHeaderDRACOString(decode_buffer.buffer, Header, decode_buffer.data_size, position, Header.draco_string.byteLength)) {
            console.log("Error: Error while decoding header.");
            return false
        }        
        if(!Header.draco_string == "DRACO") {
            console.log("Error: Header string mismatch, not a .drc file");
            return false;
        }

        // Get the version major
        if(!DecodeValue(decode_buffer.buffer, Header, decode_buffer.data_size, position, Header.version_major.BYTES_PER_ELEMENT, 'version_major')) {
            console.log("Error: Error while decoding header Version Major.");
            return false;
        }
        
        // Get the version minor
        if(!DecodeValue(decode_buffer.buffer, Header, decode_buffer.data_size, position, Header.version_minor.BYTES_PER_ELEMENT, 'version_minor')) {
            console.log("Error: Error while decoding header Version Minor.");
            return false;
        }

        // Get the encoder type
        if(!DecodeValue(decode_buffer.buffer, Header, decode_buffer.data_size, position, Header.encoder_type.BYTES_PER_ELEMENT, 'encoder_type')) {
            console.log("Error: Error while decoding header encoder type.");
            return false;
        }

        // Get the encoder method
        if(!DecodeValue(decode_buffer.buffer, Header, decode_buffer.data_size, position, Header.encoder_method.BYTES_PER_ELEMENT, 'encoder_method')) {
            console.log("Error: Error while decoding header encoder method.");
            return false;
        }
    
        // Get the flags
        if(!DecodeValue(decode_buffer.buffer, Header, decode_buffer.data_size, position, Header.flags.BYTES_PER_ELEMENT, 'flags')) {
            console.log("Error: Error while decoding header flags.");
            return false;
        }
        return true;
    }

    this.Decode = function() {
        if(!CheckEncoderType(Header.encoder_type)) {
            console.log("Error: Invalid encoding type.");
            return false;
        }

        let version_major_ = Header.version_major;
        let version_minor_ = Header.version_minor;

        // Check for version compatibility.
        decode_buffer.SetBitstreamVersion(version_major_, version_minor_);

        if(decode_buffer.bitstream_version >= DracoBitstreamVersion(1, 3) && (Header.flags & METADATA_FLAG_MASK)) {
            // Decode Meta Data
        }

        // Check for version compatibility
        if(version_major_ < 1 || version_major_ > kDracoBitstreamVersionMajor) {
            console.log("Error: Unknown Version Major");
            return false;
        }

        if(version_major_ == kDracoBitstreamVersionMajor && version_minor_ > kDracoBitstreamVersionMinor) {
            console.log("Error: Unknown Version Minor");
            return false;
        }

        // Decode Connectivity
        if(!decode_buffer.DecodeConnectivity()) {
            console.log("Error: Error while decoding Connectivity data");
            return false;
        }

        return true;
    }

    // Usage
    this.PrintUsage = function() {
        console.log("Usage: node draco_decoder.js [options] \n");
        console.log("Main Options: Include absolute path for files along with extensions");
        console.log("  -i <input>   Input draco encoded file.");
        console.log("  -o <output>   Output file name.");
        console.log("\nSupported output formats: '.ply', '.obj'");
    }

    // Debugging functions
    this.PrintIO = function () {
        console.log("ipf: " + this.input_file_location);
        console.log("opf: " + this.output_file_location);
    }
    this.print_buffer = function () {
        console.log(decode_buffer.buffer);
    }

    this.PrintHeader = function() {
        console.log("Draco String: " + Header.draco_string);
        console.log("Version Major: " + Header.version_major);
        console.log("Version Minor: " + Header.version_minor);
        console.log("Encoder Type: " + Header.encoder_type);
        console.log("Encoder Method: " + Header.encoder_method);
        console.log("Flags: " + Header.flags);
    }

    this.PrintPos = function() {
        console.log(pos);
    }
}

module.exports = Decoder;