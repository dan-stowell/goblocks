class NumberValue {
  constructor(number) {
    this.number = number;
  }

  moveright(word, blockenv, globalenv) {
    if (word === 'plus') {
      return new PlusValue(this.number);
    } else {
      return wordtovalue(word, blockenv, globalenv);
    }
  }
}

class PlusValue {
  constructor(leftnumber) {
    this.leftnumber = leftnumber;;
  }

  moveright(word, blockenv, globalenv) {
    let rightnumber = wordtovalue(word, blockenv, globalenv);
    let sum = this.leftnumber + rightnumber.number;
    return new NumberValue(this.leftnumber + rightnumber.number);
  }
}

function wordtovalue(word, blockenv, globalenv) {
  if (blockenv.has(word)) {
    return blockenv.lookup(word);
  } else if (globalenv.has(word)) {
    return globalenv.lookup(word);
  } else if (!Number.isNaN(Number.parseInt(word))) {
    return new NumberValue(Number.parseInt(word));
  } else if (!Number.isNaN(Number.parseFloat(word))) {
    return new NumberValue(Number.parseFloat(word));
  } else {
    // probably should return useful ErrorValue
    return new EmptyValue();
  }
}

class EmptyValue {
  moveright(word, blockenv, globalenv) {
    return wordtovalue(word, blockenv, globalenv);
  }
}

class IsLine {
  constructor(name, words) {
    this.name = name;
    this.words = words;
  }

  movedown(blockenv, globalenv) {
    let value = new EmptyValue();
    for (let word of this.words) {
      value = value.moveright(word, blockenv, globalenv)
    }
    blockenv.setvalue(this.name, value);
    return value;
  }
}

class Line {
  constructor(words) {
    this.words = words;
  }

  movedown(blockenv, globalenv) {
    let value = new EmptyValue();
    for (let word of this.words) {
      value = value.moveright(word, blockenv, globalenv);
    }
    return value;
  }
}

let islineregex = new RegExp(/^\s*(\S+)\s+is\s+(\S.*)$/);
let blockislineregex = new RegExp(/^\s*(\S+)\s+((\S+\s+)*)is$/);

class Env {
  constructor() {
    this.mapping = {};
  }

  has(word) {
    return (word in this.mapping);
  }

  lookup(word) {
    return this.mapping[word];
  }

  setvalue(word, value) {
    this.mapping[word] = value;
  }
}

class FunctionValue {
  constructor(boundargs, args, lines) {
    this.boundargs = boundargs;
    this.args = args;
    this.lines = lines;
  }

  moveright(word, blockenv, globalenv) {
    // you need to handle 1 last arg to be bound
    if (this.args.length === 0) {
      value = this.movedownlines();
      return value.moveright(word, blockenv, globalenv);
    } else {
      let arg = this.args[0];
      let newboundargs = Object.assign({}, this.boundargs);
      newboundargs[arg] = wordtovalue(word, blockenv, globalenv);
      return new FunctionValue(newboundargs, this.args.slice(1), this.lines);
    }
  }
}

// Get the input box
let input = document.getElementById('text');
let output = document.getElementById('output');

// Init a timeout variable to be used below
let timeout = null;

// Listen for keystroke events
input.addEventListener('keyup', function (e) {
    // Clear the timeout if it has already been set.
    // This will prevent the previous task from executing
    // if it has been less than <MILLISECONDS>
    clearTimeout(timeout);

    // Make a new timeout set to go off in 1000ms (1 second)
    timeout = setTimeout(function () {
      let blocks = input
        .value
        .split(new RegExp('\\n{2,}'));

      let numblocks = blocks
        .filter(block => block !== "")
        .length;

      let numislines = 0;
      let blockenvs = [];
      let globalenv = new Env();
      for (let block of blocks) {
        let lines = block.split('\n');
        numislines += lines
          .filter(line => islineregex.test(line))
          .length;

        let blockenv = new Env();
        if (blockislineregex.test(lines[0])) {
          let match = blockislineregex.exec(lines[0]);
          let name = match[1];
          let args = match[2]
            .trim()
            .split(new RegExp('\\s+'))
            .filter(word => word !== '');
          globalenv.setvalue(name, new FunctionValue([], args, lines.slice(1)));
        } else {
          for (let line of lines) {
            if (islineregex.test(line)) {
              let match = islineregex.exec(line);
              let name = match[1];
              let restofline = match[2];
              if (islineregex.test(restofline)) {
                // not sure whether this is an error or something we can skip
                // skip for now
                continue;
              } else {
                let words = restofline
                  .split(new RegExp('\\s+'));
                (new IsLine(name, words)).movedown(blockenv, globalenv);
              }
            } else {
              let words = line
                .split(new RegExp('\\s+'));
              let value = (new Line(words)).movedown(blockenv, globalenv);
              console.log(`value ${JSON.stringify(value)}`)
            }
          }
        }
        blockenvs.push(blockenv);
      }
      output.textContent = `${JSON.stringify(blockenvs)} // ${numblocks} blocks, ${numislines} islines`;
    }, 1000);
});