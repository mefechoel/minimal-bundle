import { createElement } from './dom';
import './additionalNote.sass';

const note = createElement(
  'div',
  { className: 'note' },
  'I have been lazy loaded!',
);

export default note;
