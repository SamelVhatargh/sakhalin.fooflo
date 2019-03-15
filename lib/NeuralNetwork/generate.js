var R = {}; // the Recurrent library

(function(global) {
    "use strict";

    // Utility fun
    function assert(condition, message) {
        // from http://stackoverflow.com/questions/15313418/javascript-assert
        if (!condition) {
            message = message || "Assertion failed";
            if (typeof Error !== "undefined") {
                throw new Error(message);
            }
            throw message; // Fallback
        }
    }

    // Random numbers utils
    var return_v = false;
    var v_val = 0.0;
    var gaussRandom = function() {
        if(return_v) {
            return_v = false;
            return v_val;
        }
        var u = 2*Math.random()-1;
        var v = 2*Math.random()-1;
        var r = u*u + v*v;
        if(r == 0 || r > 1) return gaussRandom();
        var c = Math.sqrt(-2*Math.log(r)/r);
        v_val = v*c; // cache this
        return_v = true;
        return u*c;
    }
    var randf = function(a, b) { return Math.random()*(b-a)+a; }
    var randi = function(a, b) { return Math.floor(Math.random()*(b-a)+a); }
    var randn = function(mu, std){ return mu+gaussRandom()*std; }

    // helper function returns array of zeros of length n
    // and uses typed arrays if available
    var zeros = function(n) {
        if(typeof(n)==='undefined' || isNaN(n)) { return []; }
        if(typeof ArrayBuffer === 'undefined') {
            // lacking browser support
            var arr = new Array(n);
            for(var i=0;i<n;i++) { arr[i] = 0; }
            return arr;
        } else {
            return new Float64Array(n);
        }
    }

    // Mat holds a matrix
    var Mat = function(n,d) {
        // n is number of rows d is number of columns
        this.n = n;
        this.d = d;
        this.w = zeros(n * d);
        this.dw = zeros(n * d);
    }
    Mat.prototype = {
        get: function(row, col) {
            // slow but careful accessor function
            // we want row-major order
            var ix = (this.d * row) + col;
            assert(ix >= 0 && ix < this.w.length);
            return this.w[ix];
        },
        set: function(row, col, v) {
            // slow but careful accessor function
            var ix = (this.d * row) + col;
            assert(ix >= 0 && ix < this.w.length);
            this.w[ix] = v;
        },
        toJSON: function() {
            var json = {};
            json['n'] = this.n;
            json['d'] = this.d;
            json['w'] = this.w;
            return json;
        },
        fromJSON: function(json) {
            this.n = json.n;
            this.d = json.d;
            this.w = zeros(this.n * this.d);
            this.dw = zeros(this.n * this.d);
            for(var i=0,n=this.n * this.d;i<n;i++) {
                this.w[i] = json.w[i]; // copy over weights
            }
        }
    }

    // return Mat but filled with random numbers from gaussian
    var RandMat = function(n,d,mu,std) {
        var m = new Mat(n, d);
        //fillRandn(m,mu,std);
        fillRand(m,-std,std); // kind of :P
        return m;
    }

    // Mat utils
    // fill matrix with random gaussian numbers
    var fillRandn = function(m, mu, std) { for(var i=0,n=m.w.length;i<n;i++) { m.w[i] = randn(mu, std); } }
    var fillRand = function(m, lo, hi) { for(var i=0,n=m.w.length;i<n;i++) { m.w[i] = randf(lo, hi); } }

    // Transformer definitions
    var Graph = function(needs_backprop) {
        if(typeof needs_backprop === 'undefined') { needs_backprop = true; }
        this.needs_backprop = needs_backprop;

        // this will store a list of functions that perform backprop,
        // in their forward pass order. So in backprop we will go
        // backwards and evoke each one
        this.backprop = [];
    }
    Graph.prototype = {
        backward: function() {
            for(var i=this.backprop.length-1;i>=0;i--) {
                this.backprop[i](); // tick!
            }
        },
        rowPluck: function(m, ix) {
            // pluck a row of m with index ix and return it as col vector
            assert(ix >= 0 && ix < m.n);
            var d = m.d;
            var out = new Mat(d, 1);
            for(var i=0,n=d;i<n;i++){ out.w[i] = m.w[d * ix + i]; } // copy over the data

            if(this.needs_backprop) {
                var backward = function() {
                    for(var i=0,n=d;i<n;i++){ m.dw[d * ix + i] += out.dw[i]; }
                }
                this.backprop.push(backward);
            }
            return out;
        },
        tanh: function(m) {
            // tanh nonlinearity
            var out = new Mat(m.n, m.d);
            var n = m.w.length;
            for(var i=0;i<n;i++) {
                out.w[i] = Math.tanh(m.w[i]);
            }

            if(this.needs_backprop) {
                var backward = function() {
                    for(var i=0;i<n;i++) {
                        // grad for z = tanh(x) is (1 - z^2)
                        var mwi = out.w[i];
                        m.dw[i] += (1.0 - mwi * mwi) * out.dw[i];
                    }
                }
                this.backprop.push(backward);
            }
            return out;
        },
        sigmoid: function(m) {
            // sigmoid nonlinearity
            var out = new Mat(m.n, m.d);
            var n = m.w.length;
            for(var i=0;i<n;i++) {
                out.w[i] = sig(m.w[i]);
            }

            if(this.needs_backprop) {
                var backward = function() {
                    for(var i=0;i<n;i++) {
                        // grad for z = tanh(x) is (1 - z^2)
                        var mwi = out.w[i];
                        m.dw[i] += mwi * (1.0 - mwi) * out.dw[i];
                    }
                }
                this.backprop.push(backward);
            }
            return out;
        },
        relu: function(m) {
            var out = new Mat(m.n, m.d);
            var n = m.w.length;
            for(var i=0;i<n;i++) {
                out.w[i] = Math.max(0, m.w[i]); // relu
            }
            if(this.needs_backprop) {
                var backward = function() {
                    for(var i=0;i<n;i++) {
                        m.dw[i] += m.w[i] > 0 ? out.dw[i] : 0.0;
                    }
                }
                this.backprop.push(backward);
            }
            return out;
        },
        mul: function(m1, m2) {
            // multiply matrices m1 * m2
            assert(m1.d === m2.n, 'matmul dimensions misaligned');

            var n = m1.n;
            var d = m2.d;
            var out = new Mat(n,d);
            for(var i=0;i<m1.n;i++) { // loop over rows of m1
                for(var j=0;j<m2.d;j++) { // loop over cols of m2
                    var dot = 0.0;
                    for(var k=0;k<m1.d;k++) { // dot product loop
                        dot += m1.w[m1.d*i+k] * m2.w[m2.d*k+j];
                    }
                    out.w[d*i+j] = dot;
                }
            }

            if(this.needs_backprop) {
                var backward = function() {
                    for(var i=0;i<m1.n;i++) { // loop over rows of m1
                        for(var j=0;j<m2.d;j++) { // loop over cols of m2
                            for(var k=0;k<m1.d;k++) { // dot product loop
                                var b = out.dw[d*i+j];
                                m1.dw[m1.d*i+k] += m2.w[m2.d*k+j] * b;
                                m2.dw[m2.d*k+j] += m1.w[m1.d*i+k] * b;
                            }
                        }
                    }
                }
                this.backprop.push(backward);
            }
            return out;
        },
        add: function(m1, m2) {
            assert(m1.w.length === m2.w.length);

            var out = new Mat(m1.n, m1.d);
            for(var i=0,n=m1.w.length;i<n;i++) {
                out.w[i] = m1.w[i] + m2.w[i];
            }
            if(this.needs_backprop) {
                var backward = function() {
                    for(var i=0,n=m1.w.length;i<n;i++) {
                        m1.dw[i] += out.dw[i];
                        m2.dw[i] += out.dw[i];
                    }
                }
                this.backprop.push(backward);
            }
            return out;
        },
        eltmul: function(m1, m2) {
            assert(m1.w.length === m2.w.length);

            var out = new Mat(m1.n, m1.d);
            for(var i=0,n=m1.w.length;i<n;i++) {
                out.w[i] = m1.w[i] * m2.w[i];
            }
            if(this.needs_backprop) {
                var backward = function() {
                    for(var i=0,n=m1.w.length;i<n;i++) {
                        m1.dw[i] += m2.w[i] * out.dw[i];
                        m2.dw[i] += m1.w[i] * out.dw[i];
                    }
                }
                this.backprop.push(backward);
            }
            return out;
        },
    }

    var softmax = function(m) {
        var out = new Mat(m.n, m.d); // probability volume
        var maxval = -999999;
        for(var i=0,n=m.w.length;i<n;i++) { if(m.w[i] > maxval) maxval = m.w[i]; }

        var s = 0.0;
        for(var i=0,n=m.w.length;i<n;i++) {
            out.w[i] = Math.exp(m.w[i] - maxval);
            s += out.w[i];
        }
        for(var i=0,n=m.w.length;i<n;i++) { out.w[i] /= s; }

        // no backward pass here needed
        // since we will use the computed probabilities outside
        // to set gradients directly on m
        return out;
    }

    var Solver = function() {
        this.decay_rate = 0.999;
        this.smooth_eps = 1e-8;
        this.step_cache = {};
    }
    Solver.prototype = {
        step: function(model, step_size, regc, clipval) {
            // perform parameter update
            var solver_stats = {};
            var num_clipped = 0;
            var num_tot = 0;
            for(var k in model) {
                if(model.hasOwnProperty(k)) {
                    var m = model[k]; // mat ref
                    if(!(k in this.step_cache)) { this.step_cache[k] = new Mat(m.n, m.d); }
                    var s = this.step_cache[k];
                    for(var i=0,n=m.w.length;i<n;i++) {

                        // rmsprop adaptive learning rate
                        var mdwi = m.dw[i];
                        s.w[i] = s.w[i] * this.decay_rate + (1.0 - this.decay_rate) * mdwi * mdwi;

                        // gradient clip
                        if(mdwi > clipval) {
                            mdwi = clipval;
                            num_clipped++;
                        }
                        if(mdwi < -clipval) {
                            mdwi = -clipval;
                            num_clipped++;
                        }
                        num_tot++;

                        // update (and regularize)
                        m.w[i] += - step_size * mdwi / Math.sqrt(s.w[i] + this.smooth_eps) - regc * m.w[i];
                        m.dw[i] = 0; // reset gradients for next iteration
                    }
                }
            }
            solver_stats['ratio_clipped'] = num_clipped*1.0/num_tot;
            return solver_stats;
        }
    }

    var initLSTM = function(input_size, hidden_sizes, output_size) {
        // hidden size should be a list

        var model = {};
        for(var d=0;d<hidden_sizes.length;d++) { // loop over depths
            var prev_size = d === 0 ? input_size : hidden_sizes[d - 1];
            var hidden_size = hidden_sizes[d];

            // gates parameters
            model['Wix'+d] = new RandMat(hidden_size, prev_size , 0, 0.08);
            model['Wih'+d] = new RandMat(hidden_size, hidden_size , 0, 0.08);
            model['bi'+d] = new Mat(hidden_size, 1);
            model['Wfx'+d] = new RandMat(hidden_size, prev_size , 0, 0.08);
            model['Wfh'+d] = new RandMat(hidden_size, hidden_size , 0, 0.08);
            model['bf'+d] = new Mat(hidden_size, 1);
            model['Wox'+d] = new RandMat(hidden_size, prev_size , 0, 0.08);
            model['Woh'+d] = new RandMat(hidden_size, hidden_size , 0, 0.08);
            model['bo'+d] = new Mat(hidden_size, 1);
            // cell write params
            model['Wcx'+d] = new RandMat(hidden_size, prev_size , 0, 0.08);
            model['Wch'+d] = new RandMat(hidden_size, hidden_size , 0, 0.08);
            model['bc'+d] = new Mat(hidden_size, 1);
        }
        // decoder params
        model['Whd'] = new RandMat(output_size, hidden_size, 0, 0.08);
        model['bd'] = new Mat(output_size, 1);
        return model;
    }

    var forwardLSTM = function(G, model, hidden_sizes, x, prev) {
        // forward prop for a single tick of LSTM
        // G is graph to append ops to
        // model contains LSTM parameters
        // x is 1D column vector with observation
        // prev is a struct containing hidden and cell
        // from previous iteration

        if(typeof prev.h === 'undefined') {
            var hidden_prevs = [];
            var cell_prevs = [];
            for(var d=0;d<hidden_sizes.length;d++) {
                hidden_prevs.push(new R.Mat(hidden_sizes[d],1));
                cell_prevs.push(new R.Mat(hidden_sizes[d],1));
            }
        } else {
            var hidden_prevs = prev.h;
            var cell_prevs = prev.c;
        }

        var hidden = [];
        var cell = [];
        for(var d=0;d<hidden_sizes.length;d++) {

            var input_vector = d === 0 ? x : hidden[d-1];
            var hidden_prev = hidden_prevs[d];
            var cell_prev = cell_prevs[d];

            // input gate
            var h0 = G.mul(model['Wix'+d], input_vector);
            var h1 = G.mul(model['Wih'+d], hidden_prev);
            var input_gate = G.sigmoid(G.add(G.add(h0,h1),model['bi'+d]));

            // forget gate
            var h2 = G.mul(model['Wfx'+d], input_vector);
            var h3 = G.mul(model['Wfh'+d], hidden_prev);
            var forget_gate = G.sigmoid(G.add(G.add(h2, h3),model['bf'+d]));

            // output gate
            var h4 = G.mul(model['Wox'+d], input_vector);
            var h5 = G.mul(model['Woh'+d], hidden_prev);
            var output_gate = G.sigmoid(G.add(G.add(h4, h5),model['bo'+d]));

            // write operation on cells
            var h6 = G.mul(model['Wcx'+d], input_vector);
            var h7 = G.mul(model['Wch'+d], hidden_prev);
            var cell_write = G.tanh(G.add(G.add(h6, h7),model['bc'+d]));

            // compute new cell activation
            var retain_cell = G.eltmul(forget_gate, cell_prev); // what do we keep from cell
            var write_cell = G.eltmul(input_gate, cell_write); // what do we write to cell
            var cell_d = G.add(retain_cell, write_cell); // new cell contents

            // compute hidden state as gated, saturated cell activations
            var hidden_d = G.eltmul(output_gate, G.tanh(cell_d));

            hidden.push(hidden_d);
            cell.push(cell_d);
        }

        // one decoder to outputs at end
        var output = G.add(G.mul(model['Whd'], hidden[hidden.length - 1]),model['bd']);

        // return cell memory, hidden representation and output
        return {'h':hidden, 'c':cell, 'o' : output};
    }

    var initRNN = function(input_size, hidden_sizes, output_size) {
        // hidden size should be a list

        var model = {};
        for(var d=0;d<hidden_sizes.length;d++) { // loop over depths
            var prev_size = d === 0 ? input_size : hidden_sizes[d - 1];
            var hidden_size = hidden_sizes[d];
            model['Wxh'+d] = new R.RandMat(hidden_size, prev_size , 0, 0.08);
            model['Whh'+d] = new R.RandMat(hidden_size, hidden_size, 0, 0.08);
            model['bhh'+d] = new R.Mat(hidden_size, 1);
        }
        // decoder params
        model['Whd'] = new RandMat(output_size, hidden_size, 0, 0.08);
        model['bd'] = new Mat(output_size, 1);
        return model;
    }

    var forwardRNN = function(G, model, hidden_sizes, x, prev) {
        // forward prop for a single tick of RNN
        // G is graph to append ops to
        // model contains RNN parameters
        // x is 1D column vector with observation
        // prev is a struct containing hidden activations from last step

        if(typeof prev.h === 'undefined') {
            var hidden_prevs = [];
            for(var d=0;d<hidden_sizes.length;d++) {
                hidden_prevs.push(new R.Mat(hidden_sizes[d],1));
            }
        } else {
            var hidden_prevs = prev.h;
        }

        var hidden = [];
        for(var d=0;d<hidden_sizes.length;d++) {

            var input_vector = d === 0 ? x : hidden[d-1];
            var hidden_prev = hidden_prevs[d];

            var h0 = G.mul(model['Wxh'+d], input_vector);
            var h1 = G.mul(model['Whh'+d], hidden_prev);
            var hidden_d = G.relu(G.add(G.add(h0, h1), model['bhh'+d]));

            hidden.push(hidden_d);
        }

        // one decoder to outputs at end
        var output = G.add(G.mul(model['Whd'], hidden[hidden.length - 1]),model['bd']);

        // return cell memory, hidden representation and output
        return {'h':hidden, 'o' : output};
    }

    var sig = function(x) {
        // helper function for computing sigmoid
        return 1.0/(1+Math.exp(-x));
    }

    var maxi = function(w) {
        // argmax of array w
        var maxv = w[0];
        var maxix = 0;
        for(var i=1,n=w.length;i<n;i++) {
            var v = w[i];
            if(v > maxv) {
                maxix = i;
                maxv = v;
            }
        }
        return maxix;
    }

    var samplei = function(w) {
        // sample argmax from w, assuming w are
        // probabilities that sum to one
        var r = randf(0,1);
        var x = 0.0;
        var i = 0;
        while(true) {
            x += w[i];
            if(x > r) { return i; }
            i++;
        }
        return w.length - 1; // pretty sure we should never get here?
    }

    // various utils
    global.maxi = maxi;
    global.samplei = samplei;
    global.randi = randi;
    global.softmax = softmax;
    global.assert = assert;

    // classes
    global.Mat = Mat;
    global.RandMat = RandMat;

    global.forwardLSTM = forwardLSTM;
    global.initLSTM = initLSTM;
    global.forwardRNN = forwardRNN;
    global.initRNN = initRNN;

    // optimization
    global.Solver = Solver;
    global.Graph = Graph;

})(R);

// prediction params
var sample_softmax_temperature = 0.8; // how peaky model predictions should be
var max_chars_gen = 100; // max length of generated sentences
// various global var inits
var epoch_size = -1;
var input_size = -1;
var input_size = 0;
var output_size = -1;
var output_size = 0;
var letterToIndex = {};
var indexToLetter = {};
var vocab = [];
var data_sents = ['test'];
var solver = new R.Solver(); // should be class because it needs memory for step caches
//let pplGraph = new Rvis.Graph();

// model parameters
generator = 'lstm'; // can be 'rnn' or 'lstm'
hidden_sizes = [20,20]; // list of sizes of hidden layers
letter_size = 5; // size of letter embeddings

// optimization
regc = 0.000001; // L2 regularization strength
learning_rate = 0.01; // learning rate
clipval = 5.0; // clip gradients at this value

var model = {};

var initVocab = function(sents, count_threshold) {
    // go over all characters and keep track of all unique ones seen
    var txt = sents.join(''); // concat all
    // count up all characters
    var d = {};
    for(var i=0,n=txt.length;i<n;i++) {
        var txti = txt[i];
        if(txti in d) { d[txti] += 1; }
        else { d[txti] = 1; }
    }
    // filter by count threshold and create pointers
    letterToIndex = {};
    indexToLetter = {};
    vocab = [];
    // NOTE: start at one because we will have START and END tokens!
    // that is, START token will be index 0 in model letter vectors
    // and END token will be index 0 in the next character softmax
    var q = 1;
    for(ch in d) {
        if(d.hasOwnProperty(ch)) {
            if(d[ch] >= count_threshold) {
                // add character to vocab
                letterToIndex[ch] = q;
                indexToLetter[q] = ch;
                vocab.push(ch);
                q++;
            }
        }
    }
    // globals written: indexToLetter, letterToIndex, vocab (list), and:
    input_size = vocab.length + 1;
    output_size = vocab.length + 1;
    epoch_size = sents.length;
    $("#prepro_status").text('found ' + vocab.length + ' distinct characters: ' + vocab.join(''));
}
var utilAddToModel = function(modelto, modelfrom) {
    for(var k in modelfrom) {
        if(modelfrom.hasOwnProperty(k)) {
            // copy over the pointer but change the key to use the append
            modelto[k] = modelfrom[k];
        }
    }
}
var initModel = function() {
    // letter embedding vectors
    var model = {};
    model['Wil'] = new R.RandMat(input_size, letter_size , 0, 0.08);

    if(generator === 'rnn') {
        var rnn = R.initRNN(letter_size, hidden_sizes, output_size);
        utilAddToModel(model, rnn);
    } else {
        var lstm = R.initLSTM(letter_size, hidden_sizes, output_size);
        utilAddToModel(model, lstm);
    }
    return model;
}
var reinit_learning_rate_slider = function() {
    // init learning rate slider for controlling the decay
    // note that learning_rate is a global variable
    $("#lr_slider").slider({
        min: Math.log10(0.01) - 3.0,
        max: Math.log10(0.01) + 0.05,
        step: 0.05,
        value: Math.log10(learning_rate),
        slide: function( event, ui ) {
            learning_rate = Math.pow(10, ui.value);
            $("#lr_text").text(learning_rate.toFixed(5));
        }
    });
    $("#lr_text").text(learning_rate.toFixed(5));
}
var reinit = function() {
    // note: reinit writes global vars

    // eval options to set some globals
    //eval($("#newnet").val());
    reinit_learning_rate_slider();
    solver = new R.Solver(); // reinit solver
    pplGraph = new Rvis.Graph();
    ppl_list = [];
    tick_iter = 0;
    // process the input, filter out blanks
    // var data_sents_raw = $('#ti').val().split('\n');
    var data_sents_raw =[];
    data_sents = ['test'];
    for(var i=0;i<data_sents_raw.length;i++) {
        var sent = data_sents_raw[i].trim();
        if(sent.length > 0) {
            data_sents.push(sent);
        }
    }
    initVocab(data_sents, 1); // takes count threshold for characters
    model = initModel();
}
var saveModel = function() {
    var out = {};
    out['hidden_sizes'] = hidden_sizes;
    out['generator'] = generator;
    out['letter_size'] = letter_size;
    var model_out = {};
    for(var k in model) {
        if(model.hasOwnProperty(k)) {
            model_out[k] = model[k].toJSON();
        }
    }
    out['model'] = model_out;
    var solver_out = {};
    solver_out['decay_rate'] = solver.decay_rate;
    solver_out['smooth_eps'] = solver.smooth_eps;
    step_cache_out = {};
    for(var k in solver.step_cache) {
        if(solver.step_cache.hasOwnProperty(k)) {
            step_cache_out[k] = solver.step_cache[k].toJSON();
        }
    }
    solver_out['step_cache'] = step_cache_out;
    out['solver'] = solver_out;
    out['letterToIndex'] = letterToIndex;
    out['indexToLetter'] = indexToLetter;
    out['vocab'] = vocab;
    $("#tio").val(JSON.stringify(out));
}
var loadModel = function(j) {
    hidden_sizes = j.hidden_sizes;
    generator = j.generator;
    letter_size = j.letter_size;
    model = {};
    for(var k in j.model) {
        if(j.model.hasOwnProperty(k)) {
            var matjson = j.model[k];
            model[k] = new R.Mat(1,1);
            model[k].fromJSON(matjson);
        }
    }
    solver = new R.Solver(); // have to reinit the solver since model changed
    // solver.decay_rate = j.solver.decay_rate;
    // solver.smooth_eps = j.solver.smooth_eps;
    // solver.step_cache = {};
    // for(var k in j.solver.step_cache){
    //     if(j.solver.step_cache.hasOwnProperty(k)){
    //         var matjson = j.solver.step_cache[k];
    //         solver.step_cache[k] = new R.Mat(1,1);
    //         solver.step_cache[k].fromJSON(matjson);
    //     }
    // }
    letterToIndex = j['letterToIndex'];
    indexToLetter = j['indexToLetter'];
    vocab = j['vocab'];
    // reinit these
    ppl_list = [];
    tick_iter = 0;
}
var forwardIndex = function(G, model, ix, prev) {
    var x = G.rowPluck(model['Wil'], ix);
    // forward prop the sequence learner
    if(generator === 'rnn') {
        var out_struct = R.forwardRNN(G, model, hidden_sizes, x, prev);
    } else {
        var out_struct = R.forwardLSTM(G, model, hidden_sizes, x, prev);
    }
    return out_struct;
}
var predictSentence = function(model, samplei, temperature) {
    if(typeof samplei === 'undefined') { samplei = false; }
    if(typeof temperature === 'undefined') { temperature = 1.0; }
    var G = new R.Graph(false);
    var s = '';
    var prev = {};
    while(true) {
        // RNN tick
        var ix = s.length === 0 ? 0 : letterToIndex[s[s.length-1]];
        var lh = forwardIndex(G, model, ix, prev);
        prev = lh;
        // sample predicted letter
        logprobs = lh.o;
        if(temperature !== 1.0 && samplei) {
            // scale log probabilities by temperature and renormalize
            // if temperature is high, logprobs will go towards zero
            // and the softmax outputs will be more diffuse. if temperature is
            // very low, the softmax outputs will be more peaky
            for(var q=0,nq=logprobs.w.length;q<nq;q++) {
                logprobs.w[q] /= temperature;
            }
        }
        probs = R.softmax(logprobs);
        if(samplei) {
            var ix = R.samplei(probs.w);
        } else {
            var ix = R.maxi(probs.w);
        }

        if(ix === 0) break; // END token predicted, break out
        if(s.length > max_chars_gen) { break; } // something is wrong
        var letter = indexToLetter[ix];
        s += letter;
    }
    return s;
}
var costfun = function(model, sent) {
    // takes a model and a sentence and
    // calculates the loss. Also returns the Graph
    // object which can be used to do backprop
    var n = sent.length;
    var G = new R.Graph();
    var log2ppl = 0.0;
    var cost = 0.0;
    var prev = {};
    for(var i=-1;i<n;i++) {
        // start and end tokens are zeros
        var ix_source = i === -1 ? 0 : letterToIndex[sent[i]]; // first step: start with START token
        var ix_target = i === n-1 ? 0 : letterToIndex[sent[i+1]]; // last step: end with END token
        lh = forwardIndex(G, model, ix_source, prev);
        prev = lh;
        // set gradients into logprobabilities
        logprobs = lh.o; // interpret output as logprobs
        probs = R.softmax(logprobs); // compute the softmax probabilities
        log2ppl += -Math.log2(probs.w[ix_target]); // accumulate base 2 log prob and do smoothing
        cost += -Math.log(probs.w[ix_target]);
        // write gradients into log probabilities
        logprobs.dw = probs.w;
        logprobs.dw[ix_target] -= 1
    }
    var ppl = Math.pow(2, log2ppl / (n - 1));
    return {'G':G, 'ppl':ppl, 'cost':cost};
}
function median(values) {
    values.sort( function(a,b) {return a - b;} );
    var half = Math.floor(values.length/2);
    if(values.length % 2) return values[half];
    else return (values[half-1] + values[half]) / 2.0;
}
var ppl_list = [];
var tick_iter = 0;
var tick = function() {
    // sample sentence fromd data
    var sentix = R.randi(0,data_sents.length);
    var sent = data_sents[sentix];
    var t0 = +new Date();  // log start timestamp
    // evaluate cost function on a sentence
    var cost_struct = costfun(model, sent);

    // use built up graph to compute backprop (set .dw fields in mats)
    cost_struct.G.backward();
    // perform param update
    var solver_stats = solver.step(model, learning_rate, regc, clipval);
    //$("#gradclip").text('grad clipped ratio: ' + solver_stats.ratio_clipped)
    var t1 = +new Date();
    var tick_time = t1 - t0;
    ppl_list.push(cost_struct.ppl); // keep track of perplexity
    // evaluate now and then
    tick_iter += 1;
    if(tick_iter % 50 === 0) {
        // draw samples
        $('#samples').html('');
        for(var q=0;q<5;q++) {
            var pred = predictSentence(model, true, sample_softmax_temperature);
            var pred_div = '<div class="apred">'+pred+'</div>'
            $('#samples').append(pred_div);
        }
    }
    if(tick_iter % 10 === 0) {
        // draw argmax prediction
        $('#argmax').html('');
        var pred = predictSentence(model, false);
        var pred_div = '<div class="apred">'+pred+'</div>'
        $('#argmax').append(pred_div);
        // keep track of perplexity
        $('#epoch').text('epoch: ' + (tick_iter/epoch_size).toFixed(2));
        $('#ppl').text('perplexity: ' + cost_struct.ppl.toFixed(2));
        $('#ticktime').text('forw/bwd time per example: ' + tick_time.toFixed(1) + 'ms');
        if(tick_iter % 100 === 0) {
            var median_ppl = median(ppl_list);
            ppl_list = [];
            pplGraph.add(tick_iter, median_ppl);
            pplGraph.drawSelf(document.getElementById("pplgraph"));
        }
    }
}
var gradCheck = function() {
    var model = initModel();
    var sent = '^test sentence$';
    var cost_struct = costfun(model, sent);
    cost_struct.G.backward();
    var eps = 0.000001;
    for(var k in model) {
        if(model.hasOwnProperty(k)) {
            var m = model[k]; // mat ref
            for(var i=0,n=m.w.length;i<n;i++) {

                oldval = m.w[i];
                m.w[i] = oldval + eps;
                var c0 = costfun(model, sent);
                m.w[i] = oldval - eps;
                var c1 = costfun(model, sent);
                m.w[i] = oldval;
                var gnum = (c0.cost - c1.cost)/(2 * eps);
                var ganal = m.dw[i];
                var relerr = (gnum - ganal)/(Math.abs(gnum) + Math.abs(ganal));
                if(relerr > 1e-1) {
                    console.log(k + ': numeric: ' + gnum + ', analytic: ' + ganal + ', err: ' + relerr);
                }
            }
        }
    }
}
// reinit();
// initModel();
loadModel(require('./../../data/model.json'));
// let model = require('./../../data/model.json');


console.log(predictSentence(model, true, sample_softmax_temperature));
