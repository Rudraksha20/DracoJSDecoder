var {EncodedGeometryType} = require(`./draco_utility.js`);
var {MeshEncoderMethod} = require(`./draco_utility.js`);
var {CheckEncoderType} = require('./draco_utility.js');
var {kDracoBitstreamVersionMajor} = require('./draco_utility.js');
var {kDracoBitstreamVersionMinor} = require('./draco_utility.js');
var {DracoBitstreamVersion} = require('./draco_utility.js');
var {METADATA_FLAG_MASK} = require('./draco_utility.js');
var {Header} = require('./draco_utility.js');
var {DecodeSymbols} = require('./draco_utility.js');
var {DecoderBuffer} = require('./draco_utility.js');

function Decoder(buffer, data_size) {
    this.buffer = new DecoderBuffer(buffer, 0, data_size);
    this.num_faces;
    this.num_points;
    this.mesh = new Array();

    this.SetBitstreamVersion = function(version_major, version_minor) {
        this.buffer.setBitstreamVersion(DracoBitstreamVersion(version_major, version_minor));
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
        if(this.buffer.getBitstreamVersion() < DracoBitstreamVersion(2, 2)) {
            if(this.buffer.DecodeValue(number_of_faces, number_of_faces.num_faces.BYTES_PER_ELEMENT, 'num_faces')) {
                console.log("Error: Error while decoding the num_faces value");
                return false;
            }
            if(this.buffer.DecodeValue(number_of_points, number_of_points.num_points.BYTES_PER_ELEMENT, 'num_points')) {
                console.log("Error: Error while decoding num_points value");
                return false;
            }
        }

        if(!this.buffer.DecodeVarint(number_of_faces, 'num_faces', true)) {
            console.log("Error: Error while decoding the num_faces value");
            return false;
        }
        if(!this.buffer.DecodeVarint(number_of_points, 'num_points', true)) {
            console.log("Error: Error while decoding num_points value");
            return false;
        }

        // TODO: Check that num_faces and num_points are valid values
        // Support for 64 Bit numbers is added.. needs implementation

        // Store the number of faces and number of points value
        this.num_faces = number_of_faces.num_faces;
        this.num_points = number_of_points.num_points;

        // Decode the connectivity method
        var connect_method = {
            connectivity_method : new Uint8Array(1)
        }
        
        if(!this.buffer.DecodeValue(connect_method, connect_method.connectivity_method.BYTES_PER_ELEMENT, 'connectivity_method')) {
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
                        if(!this.buffer.DecodeValue(temp_val, temp_val.val.BYTES_PER_ELEMENT, 'val')) {
                            console.log("Error: Error while decoding sequential indices");
                            return false;
                        }
                        face[j] = new Uint32Array(temp_val.val);
                    }
                    this.mesh.push(face);
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
                        if(!this.buffer.DecodeValue(temp_vals, temp_val.val.BYTES_PER_ELEMENT, 'val')) {
                            console.log("Error: Error while decoding sequential indices");
                            return false;
                        }
                        face[j] = new Uint32Array(temp_val.val);
                    }
                    this.mesh.push(face);
                }
            } else if(number_of_points.num_points < (1 << 21) && this.bitstream_version[0] >= DracoBitstreamVersion(2,2)) {
                // Decode indices as Uint32Array
                for(let i = 0; i < number_of_faces.num_faces; i++) {
                    var face = new Array(new Uint32Array(1), new Uint32Array(1), new Uint32Array(1));
                    for(let j = 0; j < 3; j++) {
                        var temp_val = {
                            val : new Uint32Array(1)
                        }
                        if(!this.buffer.DecodeValue(temp_val, temp_val.val.BYTES_PER_ELEMENT, 'val')) {
                            console.log("Error: Error while decoding sequential indices");
                            return false;
                        }
                        face[j] = temp_val.val;
                    }
                    this.mesh.push(face);
                }
            } else {
                // Decode mesh as Uint32Array (Default)
                for(let i = 0; i < number_of_faces.num_faces; i++) {
                    var face = new Array(new Uint32Array(1), new Uint32Array(1), new Uint32Array(1));
                    for(let j = 0; j < 3; j++) {
                        var temp_val = {
                            val : new Uint32Array(1)
                        }
                        if(!this.buffer.DecodeValue(temp_val, temp_val.val.BYTES_PER_ELEMENT, 'val')) {
                            console.log("Error: Error while decoding sequential indices");
                            return false;
                        }
                        face[j] = temp_val.val;
                    }
                    this.mesh.push(face);
                }
            }
        }
        return true;
    }

    this.DecodeAndDecompressIndices = function(number_of_faces) {
        // Get decoded indices differences that were encoded with an entropy code.
        // Indices buffer
        var ind_buffer = {
            indices_buffer : new Uint32Array(number_of_faces.num_faces * 3)
        }
    
        // RAns decoding part
        if(!DecodeSymbols(number_of_faces.num_faces * 3, 1, this.buffer, ind_buffer, 'indices_buffer')) {
            console.log("Error: While decoding sequential continuity data in decoding symbols");
            return false;
        }
        
        // Rest of the decoding and decompressing
        var last_index_value = new Uint32Array(1);
        last_index_value[0] = 0;
        var vertex_index = 0;
        for(let i = 0 ; i < number_of_faces.num_faces; ++i) {
            var face = new Uint32Array(3);
            for(let j = 0 ; j < 3 ; ++j) {
                var encoded_val = new Uint32Array(1);
                encoded_val[0] = ind_buffer.indices_buffer[vertex_index++];
                var index_diff = new Uint32Array(1);
                index_diff[0] = (encoded_val[0] >> 1);
                if(encoded_val[0] & 1) {
                    index_diff[0] = -index_diff[0];
                }
                var index_value = new Uint32Array(1);
                index_value[0] = index_diff[0] + last_index_value[0];
                face[j] = index_value[0];
                last_index_value[0] = index_value[0];
            }
            this.mesh.push(face);
        }
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

    this.DecodeHeader = function() {
        // Verify that it is a Draco file
        if(!this.buffer.DecodeHeaderDRACOString(Header, Header.draco_string.byteLength)) {
            console.log("Error: Error while decoding header.");
            return false
        }        
        if(!Header.draco_string == "DRACO") {
            console.log("Error: Header string mismatch, not a .drc file");
            return false;
        }

        // Get the version major
        if(!this.buffer.DecodeValue(Header, Header.version_major.BYTES_PER_ELEMENT, 'version_major')) {
            console.log("Error: Error while decoding header Version Major.");
            return false;
        }
        
        // Get the version minor
        if(!this.buffer.DecodeValue(Header, Header.version_minor.BYTES_PER_ELEMENT, 'version_minor')) {
            console.log("Error: Error while decoding header Version Minor.");
            return false;
        }

        // Get the encoder type
        if(!this.buffer.DecodeValue(Header, Header.encoder_type.BYTES_PER_ELEMENT, 'encoder_type')) {
            console.log("Error: Error while decoding header encoder type.");
            return false;
        }

        // Get the encoder method
        if(!this.buffer.DecodeValue(Header, Header.encoder_method.BYTES_PER_ELEMENT, 'encoder_method')) {
            console.log("Error: Error while decoding header encoder method.");
            return false;
        }
    
        // Get the flags
        if(!this.buffer.DecodeValue(Header, Header.flags.BYTES_PER_ELEMENT, 'flags')) {
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
        this.SetBitstreamVersion(version_major_, version_minor_);

        if(this.buffer.getBitstreamVersion() >= DracoBitstreamVersion(1, 3) && (Header.flags & METADATA_FLAG_MASK)) {
            // Decode Meta Data
            // TODO
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
        if(!this.DecodeConnectivity()) {
            console.log("Error: Error while decoding Connectivity data");
            return false;
        }

        // Decode Attributes
        // TODO

        return true;
    }

} // DecodeBuffer End

function Decode() {
    // Decoding variables
    this.decode_buffer;

    // Decoding methods
    var mesh_sequential_encoding;
    var mesh_edgebreaker_encoding;
    
    // Create an instance of decode buffer and save the buffer in it
    this.CreateDecodeBuffer = function(buffer, size) {
        this.decode_buffer = new Decoder(buffer, size);
    }

    // Create and decode the header
    this.DecodeHeader = function () {
        if(!this.decode_buffer.DecodeHeader()) {
            console.log("Error: The header is invalid, please check your .drc encoded file");
            return false;
        }
        return true;
    }

    this.Decode = function() {
        if(!this.decode_buffer.Decode()) {
            console.log("Error: There was an error while decoding the data");
            return false;
        }   
        return true;
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
}

module.exports = Decode;