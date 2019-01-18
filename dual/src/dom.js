export const createElement = (type, { className, ...props }, ...children) => {
  const elem = document.createElement(type);
  if (className) {
    elem.classList.add(className);
  }
  for (const key of Object.keys(props || {})) {
    elem[key] = props[key];
  }
  for (const child of children || []) {
    if (typeof child === 'string') {
      elem.innerText += child;
    } else {
      elem.appendChild(child);
    }
  }
  return elem;
};

export const render = (root) => (...elems) => {
  for (const elem of elems) {
    root.appendChild(elem);
  }
};
