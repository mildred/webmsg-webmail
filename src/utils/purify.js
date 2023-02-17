import { sanitize } from '../utils/sanitize.js';
import { marked } from 'marked';

// TODO: use cssfilter to filter CSS
// <https://github.com/leizongmin/js-css-filter> ?
export function purify(text, type) {

  // TODO: convert text to html, use markdown

  const charset = type.match(/charset=(\S*)/)[1]

  if (type.startsWith('text/plain')) {
    text = marked(text)
  }

  let dom = sanitize(text)

  let doc = dom.ownerDocument
  let it = doc.createNodeIterator(dom, NodeFilter.SHOW_TEXT)
  let node;
  let checkboxes = []

  let signatures = []

  // Find all signatures and mark them (some might be in blockquotes)
  // iterate first and perform the updates after to avoid infinite iteration
  while (node = it.nextNode()) {
    if(node.textContent.startsWith('-- ')) {
      signatures.push(node)
    }
  }
  for(let node of signatures) {
    // Get up the hierarchy until the signature is not in a block by itself
    // Stop if we reach a blockquote
    while(node.previousSibling == null && node.tagName != 'BLOCKQUOTE') {
      node = node.parentNode
    }
    // If it's not an element, we could not reach up the tree. Move nodes
    // inside a div.
    if(node.nodeType != doc.ELEMENT_NODE) {
      let div = doc.createElement('div')
      node.parentNode.insertBefore(div, node)
      while(div.nextSibling) {
        div.insertBefore(div.nextSibling, null)
      }
      node = div
    }
    // If it's an element, we wrap it in a label and add a specific CSS
    // class to mark it
    let checkbox = doc.createElement('input')
    checkboxes.push(checkbox)
    let checkbox_id = `jmapweb-checkbox${checkboxes.length}`
    checkbox.setAttribute('type', 'checkbox')
    checkbox.setAttribute('id', checkbox_id)
    checkbox.classList.add('jmapweb--signature-checkbox')
    let label = doc.createElement('label')
    label.setAttribute('for', checkbox_id)
    label.classList.add('jmapweb--signature')

    node.parentNode.insertBefore(checkbox, node)
    node.parentNode.insertBefore(label, node)
    label.insertBefore(node, null)
  }

  // Wrap every blockquote in checkbox + label
  let blockquotes = Array.from(dom.querySelectorAll('blockquote'))
  for(let quote of blockquotes) {
    let checkbox = doc.createElement('input')
    checkboxes.push(checkbox)
    let checkbox_id = `jmapweb-checkbox${checkboxes.length}`
    checkbox.setAttribute('type', 'checkbox')
    checkbox.setAttribute('id', checkbox_id)
    checkbox.classList.add('jmapweb--blockquote-checkbox')
    let label = doc.createElement('label')
    label.setAttribute('for', checkbox_id)
    label.classList.add('jmapweb--blockquote')

    quote.parentNode.insertBefore(checkbox, quote)
    quote.parentNode.insertBefore(label, quote)
    label.insertBefore(quote, null)
  }

  // Add CSS
  let css = doc.createElement('style')
  css.textContent = `
    .jmapweb--signature-checkbox:not(:checked), .jmapweb--blockquote-checkbox {
      width: 0;
      height: 0;
      visibility: none;
      opacity: 0;
      position: absolute;
    }

    .jmapweb--signature-checkbox:not(:checked) + label::before {
      content: "--\\00A0";
      color: #888;
      /*
      border: #888 solid 0.1em;
      padding-left: 0.5em;
      padding-right: 0.5em;
      border-radius: 0.25em;
      background-color: #eee;
      */
      cursor: pointer;
    }
    .jmapweb--signature-checkbox:not(:checked) + label:hover::before {
      color: #666;
      /*
      background-color: #ddd;
      border-color: #666;
      */
    }
    .jmapweb--signature-checkbox:checked {
      display: none;
    }
    .jmapweb--signature-checkbox:checked + label {
      cursor: pointer;
      color: #888;
    }
    .jmapweb--signature-checkbox:checked + label:hover {
      color: #666;
    }
    .jmapweb--signature-checkbox:not(:checked) + label > * {
      display: none;
    }


    .jmapweb--blockquote {
      cursor: pointer;
      display: block;
      position: relative;
      border-left: #ddd solid 0.25em;
    }
    .jmapweb--blockquote-checkbox:not(:checked) + .jmapweb--blockquote {
      overflow: clip;
      max-height: 5em;
    }
    .jmapweb--blockquote-checkbox:not(:checked) + .jmapweb--blockquote::after {
      content: "";
      width: 100%;
      height: 5em;
      position: absolute;
      bottom: 0;
      left: 0;
      background: linear-gradient(transparent, white);
    }
  `
  dom.querySelector('head').insertBefore(css, null)

  //const charsetNode = doc.createElement('meta')
  //charsetNode.setAttribute('charset', charset)
  //dom.querySelector('head').insertBefore(charsetNode, null)

  // make links open in top context and check links
  for(let node of dom.querySelectorAll('[href]')) {
    node.setAttribute('target', '_top')
    node.setAttribute('rel', 'external email-external')
  }

  return dom.outerHTML
}

