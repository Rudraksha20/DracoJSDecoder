// Support for 64bit using the Google Closure Library
require("google-closure-library")
goog.require("goog.math.Long");

// Internal helper class to decode bits from a bit buffer.
function BitDecoder() {
    this.bit_buffer_ = new Uint8Array(1);
    this.bit_buffer_end_ = new Uint8Array(1);
    this.bit_offset_ = new goog.math.Long(0,0); // Representing the 64 bit number as 2 32 bit number.

    // Starts decoding a bit sequence.
    // decode_size must be true if the size of the encoded bit data was included,
    // during encoding. The size is then returned to out_size.
    // Returns false on error.
    this.StartBitDecoding = function(decode_size, buffer) {

    }
}

function DecoderBuffer(buffer, position, data_size) {
    this.buffer = buffer;
    this.position = position;
    this.data_size = data_size;
    this.bitstream_version = new Uint16Array(1);
    this.bit_mode_ = false;
    this.bit_decoder_ = new BitDecoder();

    this.getBitstreamVersion = function() {
        return this.bitstream_version[0];
    }

    this.getDataSize = function() {
        return this.data_size;
    }

    this.setBitstreamVersion = function(bsv) {
        return this.bitstream_version = bsv;
    }

    this.getBitMode = function() {
        return this.bit_mode_;
    }

    this.setBitMode = function(bm) {
        this.bit_mode_ = bm;
    }

    this.getPosition = function() {
        return this.position;
    }
    
    this.setPosition = function(pos) {
        this.position = pos;
    }

    this.getBuffer = function() {
        return this.buffer;
    }

    this.DecodeValue = function(out_value, size, attribute_name) {
        if(this.data_size < this.position + size) {
            return false;
        }
    
        let temp = new Uint8Array(size);
    
        for(let i = this.position, j = (size -1); i < this.position + size; i++, j--) {
            temp[j] = this.buffer.slice(i, i+1)[0];
        }
    
        for(let k = 0; k < size; k++) {
            out_value[attribute_name][0] <<= (8*k);
            out_value[attribute_name][0] |= temp[k];
        }
        
        this.position += size;
        return true;
    }

    // Decodes a specified integer as varint. Note that the in type must be the
    // same as the one used in the corresponding EncodeVarint() call.
    this.DecodeVarint = function(out_value, attribute_name, unsigned) {
        if(unsigned) {  
            // Coding of unsigned values.
            // 0-6 bit - data
            // 7 bit - next byte?

            var in_value = {
                in_val : new Uint8Array(1)
            };

            if(!this.DecodeValue(in_value, in_value.in_val.BYTES_PER_ELEMENT, 'in_val')) {
                return false;
            }

            if(in_value.in_val & (1 << 7)) {
                // Next byte is available, decode it first
                if(!this.DecodeVarint(out_value, attribute_name, unsigned)) {
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

            if(!this.DecodeVarint(temp_out_val, 'val', true)) {
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


    // Decodes a specified 64 BIT integer as varint. Note that the in type must be the
    // same as the one used in the corresponding EncodeVarint() call.
    this.DecodeVarint64Bit = function(out_value, attribute_name, unsigned) {
        // 64 bit number reperesented as two 32 bit numbers
        // Number stored as -> [HIGH (32 bits), LOW (32 bits)]. Takes in value as goog.math.Long(LOW, HIGH)
        if(unsigned) {  
            // Coding of unsigned values.
            // 0-6 bit - data
            // 7 bit - next byte?

            var in_value = {
                in_val : new Uint8Array(1)
            };

            if(!this.DecodeValue(in_value, in_value.in_val.BYTES_PER_ELEMENT, 'in_val')) {
                return false;
            }

            if(in_value.in_val & (1 << 7)) {
                // Next byte is available, decode it first
                if(!this.DecodeVarint(out_value, attribute_name, unsigned)) {
                    return false;
                }
                // Append decoded info from this byte.
                out_value[attribute_name].shiftLeft(7);
                out_value[attribute_name].or(new goog.math.Long(in_value.in_val & ((1 << 7) - 1)), 0);
            } else {
                // Last byte reached
                out_value[attribute_name] = new goog.math.Long(in_value.in_val, 0);
            }

        } else {
            // This might not be needed... Not sure?
        }
        return true;
    }  

    this.DecodeValue64Bit = function(out_value, size, attribute_name) {
        if(data_size < this.position + size) {
            return false;
        }

        let temp = new Uint8Array(size);

        for(let i = this.position, j = (size -1); i < this.position + size; i++, j--) {
            temp[j] = buffer.slice(i, i+1)[0];
        }

        for(let k = 0; k < size; k++) {
            out_value[attribute_name].shiftLeft(8*k);
            out_value[attribute_name].or(temp[k]);
        }
        
        this.position += size;
        return true;
    }

    this.DecodeHeaderDRACOString = function(Header, size) {
        if(data_size < this.position + size) {
            return false;
        }
    
        var result = "";
        for(let i = this.position; i < this.position + size; i++) {
            result += String.fromCharCode(buffer.slice(i,i+1)[0]);
        }
        Header.draco_string = result;
        this.position += size;
        return true;
    }

} // DecodeBuffer End

var Header = {
    draco_string : new Int8Array(5),
    version_major : new Uint8Array(1),
    version_minor : new Uint8Array(1),
    encoder_type : new Uint8Array(1),
    encoder_method : new Uint8Array(1),
    flags : new Uint16Array(1)
}

// Currently, we support point cloud and triangular mesh encoding.
// TODO(scottgodfrey) convert enum to enum class (safety, not performance).
var EncodedGeometryType = {
    INVALID_GEOMETRY_TYPE   :  -1,
    POINT_CLOUD             :   0,
    TRIANGULAR_MESH         :   1
};

// Different methods for symbol entropy encoding
var SymbolCodingMethod = {
    SYMBOL_CODING_TAGGED        : 0,
    SYMBOL_CODING_RAW           : 1,
    NUM_SYMBOL_CODING_METHODS   : 2
}

// List of encoding methods for meshes.
var MeshEncoderMethod = {
    MESH_SEQUENTIAL_ENCODING : 0,
    MESH_EDGEBREAKER_ENCODING: 1
};

// For backwards compatibility
if(Object.freeze) {
    Object.freeze(EncodedGeometryType);
}

// Degraded remove after testing...
// Global variable for iterating over the buffer
// var position = {
//     pos : 0
// };

// Latest Draco bistream version
var kDracoBitstreamVersionMajor = new Uint8Array(1);
kDracoBitstreamVersionMajor[0] = 2;
var kDracoBitstreamVersionMinor = new Uint8Array(1);
kDracoBitstreamVersionMinor[0] = 2;

// Flag mask used to validate the metadata in the input buffer
var METADATA_FLAG_MASK = 0x8000;
// Global variables
var io_base = 256;

function AnsDecoder() {
    this.buf = new Uint8Array(1);
    this.buf_offset = 0;
    this.state = new Uint32Array(1);

    this.getBuf = function() {
        return this.buf[0];
    }

    this.getbufOffset = function() {
        return this.buf_offset;
    }

    this.getState = function() {
        return this.state[0];
    }

    this.setBuf = function(buf_val) {
        this.buf[0] = buf_val;
    }

    this.setBufOffset = function(buf_offset_val) {
        this.buf_offset = buf_offset_val;
    }

    this.setState = function(state_val) {
        this.state[0] = state_val;
    }
};


// rans_sym object
function rans_sym(probability, cum_probability) {
    this.prob = probability;
    this.cum_prob = cum_probability; // not-inclusive

    this.getProb = function() {
        return this.prob;
    }
    this.getCumProb = function() {
        return this.cum_prob;
    }
}

function rans_dec_sym() {
    this.val = new Uint32Array(1);
    this.prob = new Uint32Array(1);
    this.cum_prob = new Uint32Array(1);  // not-inclusive

    this.getVal = function() {
        return this.val[0];
    }
    this.getProb = function() {
        return this.prob[0];
    }
    this.getCumProb = function() {
        return this.cum_prob[0];
    }

    this.setVal = function(value) {
        this.val[0] = value; 
    }
    this.setProb = function(probValue) {
        this.prob[0] = probValue;
    }
    this.setCumProb = function(cumProbValue) {
        this.cum_prob[0] = cumProbValue;
    }
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

// Draco bit stream version. Converting from Uint8Array to Uint16Array
function DracoBitstreamVersion(v1, v2) {
    return ((v1 << 8) | v2);
}

// // Remove after testing
// function BufferDecode(in_value, position) {
//     return true;
// }



// Computes the desired precision of the rANS method for the specified number of
// unique symbols the input data (defined by their bit_length).
function ComputeRAnsUnclampedPrecision(symbols_bit_length) {
    return (3 * symbols_bit_length) / 2;
}

// Computes the desired precision clamped to guarantee a valid functionality of
// our rANS library (which is between 12 to 20 bits).
function ComputeRAnsPrecisionFromUniqueSymbolsBitLength(symbols_bit_length) {
    return ComputeRAnsUnclampedPrecision(symbols_bit_length) < 12 
        ? 12 : ComputeRAnsUnclampedPrecision(symbols_bit_length) > 20 
            ? 20 : ComputeRAnsUnclampedPrecision(symbols_bit_length);
}

// Class for performing rANS decoding using a desired number of precision bits.
// The number of precision bits needs to be the same as with the RAnsEncoder
// that was used to encode the input data.
function RAnsDecoder(rans_precision_bits_t) {
    this.rans_precision = 1 << rans_precision_bits_t;
    this.l_rans_base = this.rans_precision * 4;
    this.lut_table_ = 0;
    this.probability_table_ = new Array(); // Array of the object rans_sym
    this.ans_ = new AnsDecoder();

    this.mem_get_le16 = function(buffer, buf_offset) {
        var val = new Uint32Array(1);
        val[0] = buffer.getBuffer().slice(buf_offset + 1, buf_offset + 2)[0] << 8;
        val[0] |= buffer.getBuffer().slice(buf_offset,  buf_offset + 1)[0]; 
        return val[0];
    }

    this.mem_get_le24 = function(buffer, buf_offset) {
        var val = new Uint32Array(1);
        val[0] = buffer.getBuffer().slice(buf_offset + 2, buf_offset + 3)[0] << 16;
        val[0] |= buffer.getBuffer().slice(buf_offset + 1, buf_offset + 2)[0] << 8;
        val[0] |= buffer.getBuffer().slice(buf_offset, buf_offset + 1)[0];
        return val[0];
    }

    this.mem_get_le32 = function(buffer, buf_offset) {
        var val = new Uint32Array(1);
        val[0] = buffer.getBuffer().slice(buf_offset + 3, buf_offset + 4)[0] << 24;
        val[0] |= buffer.getBuffer().slice(buf_offset + 2, buf_offset + 3)[0] << 16;
        val[0] |= buffer.getBuffer().slice(buf_offset + 1, buf_offset + 2)[0] << 8;
        val[0] |= buffer.getBuffer().slice(buf_offset, buf_offset + 1)[0];
        return val[0];
    }

    this.fetch_sym = function(sym_, rem) {
        var symbol = new Uint32Array(1);
        symbol[0] = this.lut_table_[rem];
        sym_.sym.setVal(symbol);
        sym_.sym.setProb(this.probability_table_[symbol].getProb());
        sym_.sym.setCumProb(this.probability_table_[symbol].getCumProb());
    }

    this.rans_build_look_up_table = function(prob_table, num_symb, buffer) {
        this.lut_table_ = new Uint32Array(this.rans_precision);
        let cum_prob = new Uint32Array(1);
        cum_prob[0] = 0;
        let act_prob = new Uint32Array(1);
        act_prob[0] = 0;

        for(let i = 0 ; i < num_symb.num_symbols_[0]; ++i) {
            var rans_sym_object = new rans_sym(prob_table.probability_table_[i], cum_prob[0]);
            this.probability_table_.push(rans_sym_object);
            cum_prob[0] += prob_table.probability_table_[i];
            if(cum_prob[0] > this.rans_precision) {
                return false;
            }
            for(j = act_prob[0]; j < cum_prob[0]; ++j) {
                this.lut_table_[j] = i;
            }
            act_prob[0] = cum_prob[0];
        }
        if(cum_prob[0] != this.rans_precision) {
            return false;
        }
        return true;
    }

    this.read_init = function(buffer, buf, offset) {
        var x;
        if(offset < 1) {
            return 1;
        }
        this.ans_.setBuf(buf);
        x = buffer.getBuffer().slice(buf + offset - 2, buf + offset - 1)[0] >> 6;
        if(x == 0) {
            this.ans_.setBufOffset(offset - 1);
            this.ans_.setState(buffer.slice(buf + offset - 2, buf + offset - 1)[0] & 0x3F);
        } else if(x == 1) {
            if(offset < 2) {
                return 1;
            }
            this.ans_.setBufOffset(offset - 2);
            this.ans_.setState(this.mem_get_le16(buffer, buf + offset -2) & 0x3FFF);
        } else if(x == 2) {
            if(offset < 3) {
                return 1;
            }
            this.ans_.setBufOffset(offset - 3);
            this.ans_.setState(this.mem_get_le24(buffer, buf + offset - 3) & 0x3FFFFF);
        } else if(x == 3) {
            this.ans_.setBufOffset(offset - 4);
            this.ans_.setState(this.mem_get_le32(buffer, buf + offset - 4) & 0x3FFFFFFF);
        } else {
            return 1;
        }
        let state_temp = this.ans_.getState();
        state_temp += this.l_rans_base;
        this.ans_.setState(state_temp);
        if(state_temp >= this.l_rans_base * io_base) {
            return 1;
        }

        return 0;
    }

    this.rans_read = function(buffer) {
        var rem = new Uint32Array(1);
        var quo = new Uint32Array(1);
        var sym_ = { 
            sym : new rans_dec_sym()
        }
        while(this.ans_.getState() < this.l_rans_base && this.ans_.getbufOffset() > 0) {
            this.ans_.setBufOffset(this.ans_.getbufOffset() - 1);
            var buf_val = buffer.getBuffer().slice(this.ans_.getBuf() + this.ans_.getbufOffset(), this.ans_.getBuf() + this.ans_.getbufOffset() + 1)[0];
            this.ans_.setState(this.ans_.getState() * io_base + buf_val);
        }

        // There is not compilation optimization here for the division and modulo opertaion
        quo[0] = this.ans_.getState() / this.rans_precision;
        rem[0] = this.ans_.getState() % this.rans_precision;
        this.fetch_sym(sym_, rem[0]);
        this.ans_.setState(quo[0] * sym_.sym.getProb() + rem[0] - sym_.sym.getCumProb());
        return sym_.sym.getVal();
    }

    this.read_end = function() {
        return (this.ans_.getState() == this.l_rans_base);
    }

} // RAnsDecoder Ends

// RAnsSymbolDecoder Class
function RAnsSymbolDecoder(unique_symbols_bit_length_t) {
    this.num_symb = { 
        num_symbols_ : new Uint32Array(1) 
    }
    this.num_symb.num_symbols_[0] = 0; // initialization
    this.prob_table = {
        probability_table_ : 0
    }

    this.rans_precision_bits_ = ComputeRAnsPrecisionFromUniqueSymbolsBitLength(unique_symbols_bit_length_t);
    this.rans_precision_ = 1 << this.rans_precision_bits_;
    this.ans_ = new RAnsDecoder(this.rans_precision_bits_);

    this.num_symbols = function() {
        return this.num_symb.num_symbols_[0];
    }
    
    this.Create = function(buffer) {
        // Check if the Decodebuffer version is set
        if(buffer.getBitstreamVersion() == 0) {
            return false;
        }

        // Decode the number of alphabet symbols
        // Check for backwards compatibility
        if(buffer.getBitstreamVersion() < DracoBitstreamVersion(2, 0)) {
            if(!buffer.DecodeValue(num_symb, num_symb.num_symbols_.BYTES_PER_ELEMENT, 'num_symbols_')) {
                return false;
            }
        } else if (!buffer.DecodeVarint(this.num_symb, 'num_symbols_', true)) {
            return false;
        }
        
        // Resize the probability table
        this.prob_table.probability_table_ = new Uint32Array(this.num_symb.num_symbols_[0]);

        if(this.num_symb.num_symbols_[0] == 0) {
            return true;
        }
        // Decode the table
        for(let i = 0; i < this.num_symb.num_symbols_[0] ; ++i) {
            var prob_data = {
                prob_data_ : new Uint8Array(1)
            }
            prob_data.prob_data_[0] = 0;
            
            // Decode the first byte and extract the number of extra bytes we need to
            // get, or the offset to the next symbol with non-zero probability.
            if(!buffer.DecodeValue(prob_data, prob_data.prob_data_.BYTES_PER_ELEMENT, 'prob_data_')) {
                return false;
            }

            // Token is stored in the first two bits of the first byte. Values 0-2 are
            // used to indicate the number of extra bytes, and value 3 is a special
            // symbol used to denote run-length coding of zero probability entries.
            let token = prob_data.prob_data_[0] & 3;
            if(token == 3) {
                let offset = prob_data.prob_data_[0] >> 2;
                if(i + offset >= this.num_symb.num_symbols_[0]) {
                    return false;
                }
                // Set zero probability for all symbols in the specified range.
                for(let j = 0; j < offset; ++j) {
                    this.prob_table.probability_table_[i + j] = 0;
                }
                i += offset;
            } else  {
                let extra_bytes = token;
                let prob = new Uint32Array(1);
                prob[0] = prob_data.prob_data_[0] >> 2;
                for(let b = 0 ; b < extra_bytes; ++b) {
                    var eb = {
                        eb_ : new Uint8Array(1)
                    }
                    if(!buffer.DecodeValue(eb, eb.eb_.BYTES_PER_ELEMENT, 'eb_')) {
                        return false;
                    }
                    // Shift 8 bits for each extra byte and subtract 2 for the two first
                    // bits.
                    let eb_temp = new Uint32Array(1);
                    eb_temp[0] = eb.eb_[0];
                    prob[0] |= eb_temp[0] << (8 * (b + 1) - 2);
                }
                this.prob_table.probability_table_[i] = prob[0];
            }
        }
        if(!this.ans_.rans_build_look_up_table(this.prob_table, this.num_symb, buffer)) {
            return false;
        }
        return true;
    }

    this.StartDecoding = function(buffer) {
        // Supporting 64 bit numbers using the google closure library
        // 64 bit number reperesented as two 32 bit numbers
        // Number stored as -> [HIGH (32 bits) | LOW (32 bits)]. Takes in value as goog.math.Long(LOW, HIGH)
        var bytes_enc = {
            bytes_encoded : new goog.math.Long(0,0)
        }

        // Draco backwards compatibilityDracoBitstreamVersion
        if(buffer.getBitstreamVersion() < DracoBitstreamVersion(2, 0)) {
            if(!buffer.DecodeValue64Bit(bytes_enc, 8, 'bytes_encoded')) {
                return false;
            }
        } else {
            if(!buffer.DecodeVarint64Bit(bytes_enc, 'bytes_encoded', true)) {
                return false;
            }
        }
        
        if(bytes_enc.bytes_encoded.greaterThan(new goog.math.Long(buffer.getDataSize() - buffer.getPosition(), 0))) {
            return false;
        }

        var currentPosValue = buffer.getPosition();
        // Advance the buffer past the rANS data.
        // .toInt() it returns the LOW 32 bit value. This is due to the lack of support for 64 bit numbers by JS.
        // Remember to update this as support for 64 BIT numbers rolls out for JS.
        var tempPos = buffer.getPosition();
        tempPos += bytes_enc.bytes_encoded.toInt();
        buffer.setPosition(tempPos);

        if(this.ans_.read_init(buffer, currentPosValue, bytes_enc.bytes_encoded.toInt()) != 0) {
            return false;
        }

        return true;
    }

    this.DecodeSymbol = function(buffer) {
        return this.ans_.rans_read(buffer);
    }

    this.EndDecoding = function() {
        this.ans_.read_end();
    }

}// RAnsSymbolDecoder Ends

function DecodeTaggedSymbols(num_values, num_components, buffer, out_buffer, out_attribute_name) {
    this.tag_decoder = new RAnsSymbolDecoder(5);
    if(!tag_decoder.Create(buffer)) {
        return false;
    }

    if(!tag_decoder.StartDecoding(buffer)) {
        return false;
    }

    // TODO
    if(num_values > 0 && tag_decoder.num_symbols() == 0) {
        return false;
    }

    // src_buffer now points behind the encoded tag data (to the place where the
    // values are encoded).
    // TODO
    //StartBitDecoding(buffer)

    return true;
}

function DecodeRawSymbolsInternal(init_val, num_values, buffer, out_buffer, out_attribute_name) {
    var decoder = new RAnsSymbolDecoder(init_val);

    if(!decoder.Create(buffer)) {
        return false;
    }

    if(num_values > 0 && decoder.num_symbols() == 0) {
        return false;
    }    

    if(!decoder.StartDecoding(buffer)) {
        return false;
    }

    for(i = new Uint32Array(1); i[0] < num_values; ++i[0]) {
        // Decode a symbol into the value.
        value = new Uint32Array(1);
        value[0] = decoder.DecodeSymbol(buffer);
        out_buffer[out_attribute_name][i] = value[0];
    }

    decoder.EndDecoding();

    return true;
}

function DecodeRawSymbols(num_values, buffer, out_buffer, out_attribute_name) {
    this.tag_decoder;
    var max_bit_len = {
        max_bit_length : new Uint8Array(1)
    }

    if(!buffer.DecodeValue(max_bit_len, max_bit_len.max_bit_length.BYTES_PER_ELEMENT, 'max_bit_length')) {
        return false;    
    }

    switch (max_bit_len.max_bit_length[0]) {
        case 1:
            return DecodeRawSymbolsInternal(1 ,num_values, buffer, out_buffer, out_attribute_name);
            break;
        case 2:
            return DecodeRawSymbolsInternal(2 ,num_values, buffer, out_buffer, out_attribute_name);
            break;
        case 3:
            return DecodeRawSymbolsInternal(3 ,num_values, buffer, out_buffer, out_attribute_name);
            break;
        case 4:
            return DecodeRawSymbolsInternal(4 ,num_values, buffer, out_buffer, out_attribute_name);
            break;
        case 5:
            return DecodeRawSymbolsInternal(5 ,num_values, buffer, out_buffer, out_attribute_name);
            break;
        case 6:
            return DecodeRawSymbolsInternal(6 ,num_values, buffer, out_buffer, out_attribute_name);
            break;
        case 7:
            return DecodeRawSymbolsInternal(7 ,num_values, buffer, out_buffer, out_attribute_name);
            break;
        case 8:
            return DecodeRawSymbolsInternal(8 ,num_values, buffer, out_buffer, out_attribute_name);
            break;        
        case 9:
            return DecodeRawSymbolsInternal(9 ,num_values, buffer, out_buffer, out_attribute_name);
            break;
        case 10:
            return DecodeRawSymbolsInternal(10 ,num_values, buffer, out_buffer, out_attribute_name);
            break;
        case 11:
            return DecodeRawSymbolsInternal(11 ,num_values, buffer, out_buffer, out_attribute_name);
            break;
        case 12:
            return DecodeRawSymbolsInternal(12 ,num_values, buffer, out_buffer, out_attribute_name);
            break;
        case 13:
            return DecodeRawSymbolsInternal(13 ,num_values, buffer, out_buffer, out_attribute_name);
            break;
        case 14:
            return DecodeRawSymbolsInternal(14 ,num_values, buffer, out_buffer, out_attribute_name);
            break;
        case 15:
            return DecodeRawSymbolsInternal(15 ,num_values, buffer, out_buffer, out_attribute_name);
            break;
        case 16:
            return DecodeRawSymbolsInternal(16 ,num_values, buffer, out_buffer, out_attribute_name);
            break;
        case 17:
            return DecodeRawSymbolsInternal(17 ,num_values, buffer, out_buffer, out_attribute_name);
            break;
        case 18:
            return DecodeRawSymbolsInternal(18 ,num_values, buffer, out_buffer, out_attribute_name);
            break;
        default:
            return false;
    }
}

// Rans decoder part
function DecodeSymbols(num_values, num_components, buffer, out_buffer, out_attribute_name) {
    if(num_values == 0) {
        return true;
    }
    // Decode which scheme to use
    var Scheme = {
        scheme : new Uint8Array(1)
    } 
    if(!buffer.DecodeValue(Scheme, Scheme.scheme.BYTES_PER_ELEMENT, 'scheme')) {
        return false;
    }

    if(Scheme.scheme == SymbolCodingMethod.SYMBOL_CODING_TAGGED) {
        return DecodeTaggedSymbols(num_values, num_components, buffer, out_buffer, out_attribute_name);
    } else if(Scheme.scheme == SymbolCodingMethod.SYMBOL_CODING_RAW) {
        return DecodeRawSymbols(num_values, buffer, out_buffer, out_attribute_name);
    }
    return false;
}

module.exports = {
    Header                      : Header,
    EncodedGeometryType         : EncodedGeometryType,
    MeshEncoderMethod           : MeshEncoderMethod,
    CheckEncoderType            : CheckEncoderType,
    kDracoBitstreamVersionMajor : kDracoBitstreamVersionMajor,
    kDracoBitstreamVersionMinor : kDracoBitstreamVersionMinor,
    DracoBitstreamVersion       : DracoBitstreamVersion,
    METADATA_FLAG_MASK          : METADATA_FLAG_MASK,
    DecodeSymbols               : DecodeSymbols,
    DecoderBuffer               : DecoderBuffer     
}