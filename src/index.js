import './index.sass';

const header = document.createElement('h1');
header.innerText = 'Minimal Bundle';

const root = document.createElement('div');
root.innerText = 'Hello there! This is a pretty small bundle!';

document.body.appendChild(header);
document.body.appendChild(root);
