import { createElement, render } from './dom';
import './index.sass';

const main = async () => {
  const renderToBody = render(document.body);

  const header = createElement('h1', {}, 'Minimal Bundle');
  const info = createElement(
    'div',
    {},
    'Hello there! This is a pretty small bundle!',
  );

  renderToBody(header, info);

  const additionalNote = (await import('./additionalNote')).default;

  renderToBody(additionalNote);
};

main();
