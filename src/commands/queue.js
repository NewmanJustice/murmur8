/**
 * queue command - Show queue status or reset
 */
const { displayQueue, resetQueue } = require('../orchestrator');

const description = 'Show queue status (use "reset" to clear)';

async function run(args) {
  const subArg = args[1];

  if (subArg === 'reset') {
    resetQueue();
    console.log('Queue has been reset.');
  } else {
    displayQueue();
  }
}

module.exports = { run, description };
