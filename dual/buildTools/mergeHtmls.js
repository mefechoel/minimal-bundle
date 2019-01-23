/* eslint-disable no-console */
const {
  readFileSync,
  writeFileSync,
  unlinkSync,
} = require('fs');
const { parse } = require('node-html-parser');
const pretty = require('pretty');
const chalk = require('chalk');

const staticPath = `${__dirname}/../dist/static/`;

const stringify = elemList => elemList
  .map(tag => tag.toString()).join('');
const removeScripts = elemList => elemList
  .filter(({ tagName }) => tagName !== 'script');

const main = () => {
  console.log(chalk.green('Merging legacy and modern html files...'));
  console.log('');

  const legacy = readFileSync(
    `${staticPath}/legacy.index.html`,
    'utf-8',
  );
  const modern = readFileSync(
    `${staticPath}/modern.index.html`,
    'utf-8',
  );

  const modernRoot = parse(modern).querySelector('body');
  const legacyRoot = parse(legacy).querySelector('body');

  const modernBodyScripts = modernRoot.querySelectorAll('script');
  const legacyBodyScripts = legacyRoot.querySelectorAll('script');

  const modernBodyRest = removeScripts(modernRoot.querySelectorAll('*'));
  const legacyBodyRest = removeScripts(legacyRoot.querySelectorAll('*'));

  const files = new Set();
  const scripts = [];
  const allScripts = [...legacyBodyScripts, ...modernBodyScripts];

  for (const script of allScripts) {
    const { rawAttrs } = script;
    const [, fileName] = rawAttrs.match(/src=["|']([\w|\W]*)["|']/);
    if (!files.has(fileName)) {
      scripts.push(script);
      files.add(fileName);
    }
  }

  const bodyTags = new Set();
  const tags = [];
  const allTags = [...legacyBodyRest, ...modernBodyRest];

  for (const tag of allTags) {
    const tagString = tag.toString();
    if (!bodyTags.has(tagString)) {
      tags.push(tag);
      bodyTags.add(tagString);
    }
  }

  const bodyStart = legacy.indexOf('<body>') + '<body>'.length;
  const bodyEnd = legacy.indexOf('</body>');

  const indexHtml = legacy.substring(0, bodyStart) +
    stringify(tags) +
    stringify(scripts) +
    legacy.substring(bodyEnd);

  writeFileSync(
    `${staticPath}/index.html`,
    indexHtml,
    'utf-8',
  );

  console.log(chalk.green('index.html written:'));
  console.log(pretty(indexHtml));
  console.log('');

  console.log(chalk.green('removing temporary html files...'));
  console.log('');
  unlinkSync(`${staticPath}/legacy.index.html`);
  unlinkSync(`${staticPath}/modern.index.html`);

  console.log(chalk.green('Merge success!'));
};

try {
  main();
} catch (e) {
  console.log(chalk.red('An error occured:'));
  console.log(chalk.red(e));
}
