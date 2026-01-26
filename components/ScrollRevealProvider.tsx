 'use client';

 import { useEffect } from 'react';

 const REVEAL_SELECTOR = '.card-glow, [data-reveal]';

const isInViewport = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
};

const registerElement = (observer: IntersectionObserver, element: Element) => {
   if (!(element instanceof HTMLElement)) return;
  if (element.closest('[data-reveal="off"]')) return;
  if (element.classList.contains('no-reveal')) return;
   if (element.dataset.revealReady === 'true') return;
   element.dataset.revealReady = 'true';
   element.classList.add('reveal-item');
  if (isInViewport(element)) {
    element.classList.add('reveal-visible');
    element.dataset.revealed = 'true';
    element.classList.remove('opacity-0', 'animate-fade-in');
    return;
  }
   observer.observe(element);
 };

 export default function ScrollRevealProvider() {
   useEffect(() => {
     if (typeof window === 'undefined') return;
     const observer = new IntersectionObserver(
       (entries) => {
         entries.forEach((entry) => {
           if (!entry.isIntersecting) return;
           const element = entry.target as HTMLElement;
           element.classList.add('reveal-visible');
        element.classList.remove('opacity-0', 'animate-fade-in');
           element.dataset.revealed = 'true';
           observer.unobserve(entry.target);
         });
       },
       { threshold: 0.2 }
     );

     const scan = (root: ParentNode) => {
       root.querySelectorAll(REVEAL_SELECTOR).forEach((element) => {
         registerElement(observer, element);
       });
     };

     scan(document);

     const mutationObserver = new MutationObserver((mutations) => {
       mutations.forEach((mutation) => {
         mutation.addedNodes.forEach((node) => {
           if (!(node instanceof Element)) return;
           if (node.matches(REVEAL_SELECTOR)) {
             registerElement(observer, node);
           }
           node.querySelectorAll?.(REVEAL_SELECTOR).forEach((element) => {
             registerElement(observer, element);
           });
         });
       });
     });

     mutationObserver.observe(document.body, { childList: true, subtree: true });

     return () => {
       mutationObserver.disconnect();
       observer.disconnect();
     };
   }, []);

   return null;
 }
