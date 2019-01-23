/* eslint-disable no-console */
const chalk = require('chalk');
const { existsSync } = require('fs');
const rimraf = require('rimraf');

const distDir = `${__dirname}/../dist`;

if (existsSync(distDir)) {
  console.log(chalk.green('Removing dist folder...'));
  console.log('');

  try {
    rimraf.sync(distDir);
  } catch (e) {
    console.log(chalk.red('An error occured:'));
    console.log(chalk.red(e));
  }
}
