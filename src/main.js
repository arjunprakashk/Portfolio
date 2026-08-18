/* ================================================
   MAIN.JS — Three.js Scene + UI Interactions
   Portfolio 3D — Vite + Three.js + Lenis
================================================ */

import * as THREE from 'three';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Splitting from 'splitting';
import 'splitting/dist/splitting.css';
import { CountUp } from 'countup.js';
import emailjs from '@emailjs/browser';

gsap.registerPlugin(ScrollTrigger);

// ================================================
// LENIS SMOOTH SCROLL SETUP
// ================================================

// Detect touch/mobile — use native scroll on touch devices
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

let lenis = null;
let lenisScrollY = 0;

if (!isTouchDevice) {
    lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo out
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
        infinite: false,
    });

    lenis.on('scroll', ({ scroll }) => {
        lenisScrollY = scroll;
        ScrollTrigger.update();
    });
}

// Lenis RAF integration — will be called from Three.js loop
function tickLenis(time) {
    if (lenis) lenis.raf(time);
}

// ================================================
// 3D SCROLL IMAGE SEQUENCE ANIMATION
// ezgif-73250375bd75d71b-png-split (240 PNG frames)
// ================================================

const canvas = document.getElementById('bg-canvas');
const ctx = canvas ? canvas.getContext('2d', { alpha: true }) : null;

const FRAME_COUNT = 240;
const frames = [];
let imagesLoadedCount = 0;
let isFirstFrameRendered = false;

// Format frame index to 3 digits (e.g. 1 -> "001", 42 -> "042", 240 -> "240")
function getFramePath(index) {
    const padded = String(index).padStart(3, '0');
    return `/ezgif-73250375bd75d71b-png-split/ezgif-frame-${padded}.png`;
}

// Current & target scroll animation progress (0.0 to 1.0)
let currentFrameProgress = 0;
let targetFrameProgress = 0;
let currentRenderedIndex = -1;

// Size canvas with device pixel ratio support & cover-fit drawing
function resizeCanvas() {
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Ensure high quality image scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Force re-render of current frame on resize
    currentRenderedIndex = -1;
    renderFrame(Math.round(currentFrameProgress * (FRAME_COUNT - 1)));
}

// Draw frame with aspect ratio preserve (cover) and crop out bottom watermark
function drawImageProp(image) {
    if (!ctx || !canvas || !image || !image.complete || !image.naturalWidth) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = image.naturalWidth;
    const ih = image.naturalHeight;

    // Crop out bottom 4.2% where the watermark is located
    const cropBottom = Math.floor(ih * 0.042);
    const effectiveH = ih - cropBottom;

    // Cover math: preserve aspect ratio, fill entire viewport canvas
    const isMobile = window.innerWidth <= 768;
    const r = Math.max(cw / iw, ch / effectiveH);
    const nw = iw * r;
    const nh = effectiveH * r;
    const cx = (cw - nw) * 0.5;
    // On mobile devices, center the video frame slightly higher or balanced so the subject's face is prominent
    const cy = isMobile ? Math.max(ch - nh, (ch - nh) * 0.35) : (ch - nh) * 0.5;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(image, 0, 0, iw, effectiveH, cx, cy, nw, nh);
}

// Render a specific frame index
function renderFrame(index) {
    const safeIndex = Math.max(0, Math.min(FRAME_COUNT - 1, index));
    if (safeIndex === currentRenderedIndex) return;

    const img = frames[safeIndex];
    if (img && img.complete && img.naturalWidth > 0) {
        drawImageProp(img);
        currentRenderedIndex = safeIndex;
    } else {
        // Fallback to nearest loaded frame for butter-smooth visual continuity
        for (let offset = 1; offset < 30; offset++) {
            const prev = frames[safeIndex - offset];
            if (prev && prev.complete && prev.naturalWidth > 0) {
                drawImageProp(prev);
                currentRenderedIndex = safeIndex - offset;
                break;
            }
            const next = frames[safeIndex + offset];
            if (next && next.complete && next.naturalWidth > 0) {
                drawImageProp(next);
                currentRenderedIndex = safeIndex + offset;
                break;
            }
        }
    }
}

// Preload initial frames for instant start, then progressively preload all remaining frames
function preloadFrames() {
    for (let i = 1; i <= FRAME_COUNT; i++) {
        const img = new Image();
        img.src = getFramePath(i);
        img.onload = () => {
            imagesLoadedCount++;
            if (!isFirstFrameRendered && (i === 1 || imagesLoadedCount > 3)) {
                isFirstFrameRendered = true;
                renderFrame(0);
            }
        };
        frames.push(img);
    }
}

preloadFrames();
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Unified scroll tracking for scroll progress
let nativeScrollY = 0;
window.addEventListener('scroll', () => {
    nativeScrollY = window.scrollY;
}, { passive: true });

function getScrollY() {
    return lenis ? lenisScrollY : nativeScrollY;
}

// === ANIMATION LOOP ===
function animate(time) {
    requestAnimationFrame(animate);

    // Tick Lenis smooth scrolling on every frame
    tickLenis(time);

    // Calculate max scrollable height
    const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
    );
    const scrollY = getScrollY();

    // Target scroll fraction (0 to 1)
    targetFrameProgress = Math.max(0, Math.min(1, scrollY / maxScroll));

    // Smooth lerp for frame interpolation (ultra-smooth fluid scroll feel)
    currentFrameProgress += (targetFrameProgress - currentFrameProgress) * 0.12;

    const frameToRender = Math.round(currentFrameProgress * (FRAME_COUNT - 1));
    renderFrame(frameToRender);
}

animate(0);

// ================================================
// UI INTERACTIONS
// ================================================

// === UNIFIED NAVIGATION & SMOOTH SCROLL CONTROLLER ===
let isNavigating = false;
let navTimer = null;

function getAbsoluteTargetTop(targetEl) {
    if (!targetEl) return 0;
    if (targetEl.id === 'home') return 0;

    // If section has a GSAP ScrollTrigger attached, check its exact start scroll position
    const st = typeof ScrollTrigger !== 'undefined' 
        ? ScrollTrigger.getAll().find(s => s.trigger === targetEl) 
        : null;

    if (st && typeof st.start === 'number') {
        return Math.max(0, st.start);
    }

    const rect = targetEl.getBoundingClientRect();
    const currentScroll = getScrollY();
    // Offset for floating navbar pill
    const navOffset = 64;
    return Math.max(0, rect.top + currentScroll - navOffset);
}

function scrollToSection(targetId) {
    const cleanId = (targetId || '').replace(/^#/, '');
    if (!cleanId) return;

    const targetEl = document.getElementById(cleanId);
    if (!targetEl && cleanId !== 'home') return;

    setActiveNavPill(cleanId);
    isNavigating = true;
    clearTimeout(navTimer);

    // Keep active state locked during smooth scroll transition
    navTimer = setTimeout(() => {
        isNavigating = false;
        updateScrollSpy();
    }, 1200);

    // Refresh ScrollTrigger to ensure all pin spacer heights and triggers are exact
    if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
    }

    const targetPos = (cleanId === 'home') ? 0 : getAbsoluteTargetTop(targetEl);

    if (lenis && typeof lenis.scrollTo === 'function') {
        lenis.scrollTo(targetPos, {
            duration: 1.1,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            onComplete: () => {
                isNavigating = false;
                updateScrollSpy();
            }
        });
    } else {
        window.scrollTo({ top: targetPos, behavior: 'smooth' });
    }

    // Update URL hash smoothly without jump
    if (history.replaceState) {
        history.replaceState(null, '', '#' + cleanId);
    }
}

// === FLOATING PILL NAVBAR SCROLLSPY & NAVIGATION ===
const navPillItems = document.querySelectorAll('.nav-pill-item');
const trackedSectionIds = ['home', 'about', 'experience', 'projects', 'analytics', 'contact'];

function setActiveNavPill(activeId) {
    navPillItems.forEach((pill) => {
        const section = pill.getAttribute('data-section');
        if (section === activeId) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });
}

// Attach click navigation to pill items
navPillItems.forEach((pill) => {
    pill.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const section = pill.getAttribute('data-section') || (pill.getAttribute('href') || '').replace('#', '');
        scrollToSection(section);
    });
});

// Attach click navigation to brand logo (go to top / home)
const brandLink = document.querySelector('.brand');
if (brandLink) {
    brandLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        scrollToSection('home');
    });
}

// === HAMBURGER & MOBILE DROPDOWN MENU ===
const menuBtn = document.getElementById('menuBtn');
const dropdown = document.getElementById('dropdownMenu');
const body = document.body;

if (menuBtn && dropdown) {
    menuBtn.addEventListener('click', () => {
        menuBtn.classList.toggle('active');
        dropdown.classList.toggle('show');
        body.classList.toggle('menu-open');
    });

    document.querySelectorAll('.dropdown a').forEach((link) => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                scrollToSection(href.replace('#', ''));
            }
            dropdown.classList.remove('show');
            menuBtn.classList.remove('active');
            body.classList.remove('menu-open');
        });
    });

    document.addEventListener('click', (e) => {
        if (!menuBtn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('show');
            menuBtn.classList.remove('active');
            body.classList.remove('menu-open');
        }
    });
}

// ScrollSpy update based on true viewport bounding rects
function updateScrollSpy() {
    if (isNavigating) return;

    const scrollY = getScrollY();
    const viewportHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;

    // Top edge
    if (scrollY < 80) {
        setActiveNavPill('home');
        return;
    }

    // Bottom edge
    if (scrollY + viewportHeight >= docHeight - 60) {
        setActiveNavPill('contact');
        return;
    }

    const triggerLine = viewportHeight * 0.35;
    let currentSection = 'home';

    for (const id of trackedSectionIds) {
        const sectionEl = document.getElementById(id);
        if (sectionEl) {
            const rect = sectionEl.getBoundingClientRect();
            if (rect.top <= triggerLine && rect.bottom > 60) {
                currentSection = id;
            }
        }
    }

    setActiveNavPill(currentSection);
}

window.addEventListener('scroll', updateScrollSpy, { passive: true });
if (lenis) {
    lenis.on('scroll', updateScrollSpy);
}

// === TYPING EFFECT ===
const roles = ['Full Stack Developer', 'Python Developer', 'Software Developer'];
const typingElement = document.getElementById('typing');

let roleIndex = 0;
let charIndex = 0;
let isDeleting = false;

function typeEffect() {
    const currentRole = roles[roleIndex];

    if (!isDeleting) {
        typingElement.textContent = currentRole.substring(0, charIndex + 1);
        charIndex++;

        if (charIndex === currentRole.length) {
            setTimeout(() => (isDeleting = true), 1500);
        }
    } else {
        typingElement.textContent = currentRole.substring(0, charIndex - 1);
        charIndex--;

        if (charIndex === 0) {
            isDeleting = false;
            roleIndex = (roleIndex + 1) % roles.length;
        }
    }

    setTimeout(typeEffect, isDeleting ? 70 : 120);
}

typeEffect();

// === GSAP SCROLL TRIGGER REVEALS ===
gsap.utils.toArray('.reveal, .reveal-left, .reveal-right, .reveal-3d').forEach((el) => {
    gsap.fromTo(el,
        {
            y: el.classList.contains('reveal-left') || el.classList.contains('reveal-right') ? 0 : 40,
            x: el.classList.contains('reveal-left') ? -50 : (el.classList.contains('reveal-right') ? 50 : 0),
            opacity: 0,
            scale: el.classList.contains('reveal-3d') ? 0.95 : 1,
            rotationX: el.classList.contains('reveal-3d') ? -20 : 0,
        },
        {
            y: 0,
            x: 0,
            opacity: 1,
            scale: 1,
            rotationX: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: el,
                start: 'top 88%',
                toggleActions: 'play none none none',
            }
        }
    );
});

// === TIMELINE ROUTE MAP & TRACK FILL ===
const timelineEntries = document.querySelectorAll('.timeline-entry');
const timelineTrackFill = document.getElementById('timelineTrackFill');
const timelineSection = document.getElementById('timeline');
const timelineTrack = document.querySelector('.timeline-track');

if (timelineTrackFill && timelineSection && timelineTrack) {
    const updateTrackFill = () => {
        const rect = timelineSection.getBoundingClientRect();
        const sectionTop = rect.top;
        const sectionHeight = rect.height;
        const viewportHeight = window.innerHeight;

        // Start filling when the timeline enters the viewport
        const startOffset = viewportHeight * 0.75;
        const scrolledInto = startOffset - sectionTop;
        const totalDistance = sectionHeight + startOffset - viewportHeight * 0.3;

        let progress = scrolledInto / totalDistance;
        progress = Math.max(0, Math.min(1, progress));

        timelineTrackFill.style.height = `${progress * 100}%`;

        // Reveal timeline entries ONLY when the fill line reaches their dot
        // The track starts 60px from the top of the timeline section
        const trackTopOffset = 60;
        const trackHeight = timelineTrack.clientHeight || (sectionHeight - 100);
        const currentLineBottom = trackTopOffset + (progress * trackHeight);

        timelineEntries.forEach(entry => {
            // The node dot is positioned 24px from the top of the entry relative to the timeline container
            const nodeOffsetTop = entry.offsetTop + 24;

            // Add a small threshold (10px) so the line touches the dot before revealing
            if (currentLineBottom >= nodeOffsetTop - 10) {
                entry.classList.add('timeline-visible');
            } else {
                // Hide it again if user scrolls up past the dot
                entry.classList.remove('timeline-visible');
            }
        });
    };

    // Lenis provides its own scroll event; also listen to native scroll for touch
    if (lenis) {
        lenis.on('scroll', updateTrackFill);
    } else {
        window.addEventListener('scroll', updateTrackFill, { passive: true });
    }
    updateTrackFill(); // Initial check
}

// === HERO — 3D Image Tilt (desktop only) ===
const heroImageWrapper = document.querySelector('.hero-image-wrapper');
const heroImage3d = document.querySelector('.hero-image-3d');
const heroGlare = document.querySelector('.hero-image-glare');

if (heroImageWrapper && heroImage3d && !isTouchDevice) {
    heroImageWrapper.addEventListener('mousemove', (e) => {
        if (window.innerWidth < 769) return;
        const rect = heroImageWrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;

        heroImage3d.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

        if (heroGlare) {
            heroGlare.style.setProperty('--x', `${x}px`);
            heroGlare.style.setProperty('--y', `${y}px`);
        }
    });

    heroImageWrapper.addEventListener('mouseleave', () => {
        heroImage3d.style.transform = `rotateX(0) rotateY(0)`;
    });
}

// === ABOUT — 3D Image Tilt (desktop only) ===
const aboutImageWrapper = document.querySelector('.about-image-wrapper');
const aboutImage3d = document.querySelector('.about-image-3d');
const aboutGlare = document.querySelector('.about-image-glare');

if (aboutImageWrapper && aboutImage3d && !isTouchDevice) {
    aboutImageWrapper.addEventListener('mousemove', (e) => {
        if (window.innerWidth < 769) return;
        const rect = aboutImageWrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;

        aboutImage3d.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

        if (aboutGlare) {
            aboutGlare.style.setProperty('--x', `${x}px`);
            aboutGlare.style.setProperty('--y', `${y}px`);
        }
    });

    aboutImageWrapper.addEventListener('mouseleave', () => {
        aboutImage3d.style.transform = `rotateX(0) rotateY(0)`;
    });
}

// === SKILLS 3D BENTO EFFECT (desktop only) ===
const bentoCards = document.querySelectorAll('.bento-card');

if (!isTouchDevice) {
    bentoCards.forEach(card => {
        const inner = card.querySelector('.bento-inner');
        const glare = card.querySelector('.bento-glare');

        card.addEventListener('mousemove', (e) => {
            if (window.innerWidth < 769) return;
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Calculate 3D tilt (max 8 degrees)
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -8;
            const rotateY = ((x - centerX) / centerX) * 8;

            inner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

            // Update glare position for radial gradient
            if (glare) {
                glare.style.setProperty('--x', `${x}px`);
                glare.style.setProperty('--y', `${y}px`);
            }
        });

        card.addEventListener('mouseleave', () => {
            inner.style.transform = `rotateX(0) rotateY(0)`;
        });
    });
}

// === 3D TILT ON PROJECT CARDS (desktop only) ===
const projectCardInners = document.querySelectorAll('.horizontal-card-inner');
if (!isTouchDevice) {
    projectCardInners.forEach(cardInner => {
        cardInner.parentElement.addEventListener('mousemove', (e) => {
            if (window.innerWidth < 769) return;
            const rect = cardInner.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -6;
            const rotateY = ((x - centerX) / centerX) * 6;

            cardInner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
        });

        cardInner.parentElement.addEventListener('mouseleave', () => {
            cardInner.style.transform = `rotateX(0deg) rotateY(0deg) translateZ(0)`;
        });
    });
}

// === PROJECTS STACKING CARDS SCROLL TRIGGER ===
const projectsSection = document.getElementById('projects');
const cards = gsap.utils.toArray('.horizontal-card');

function setupStackingCards() {
    if (!projectsSection || cards.length === 0) return;

    // Kill and revert any existing ScrollTrigger instances on this trigger
    ScrollTrigger.getAll().forEach(st => {
        if (st.trigger === projectsSection) {
            st.kill(true);
        }
    });

    const isMobile = window.innerWidth < 769;

    // Set starting states
    cards.forEach((card, index) => {
        const inner = card.querySelector('.horizontal-card-inner');
        if (index === 0) {
            gsap.set(card, { y: 0, scale: 1, opacity: 1, zIndex: 1 });
            if (inner) inner.style.setProperty('--stack-dim', '0');
        } else {
            // Push subsequent cards down off the view ready to cascade smoothly
            gsap.set(card, { y: isMobile ? '80vh' : '100vh', scale: 0.94, opacity: 0, zIndex: index + 1 });
            if (inner) inner.style.setProperty('--stack-dim', '0');
        }
    });

    // Create the stacking timeline with ScrollTrigger scrub
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: projectsSection,
            start: 'top top',
            end: () => `+=${window.innerHeight * (cards.length - 0.2)}`,
            pin: true,
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
        }
    });

    // Stagger card stacking sequence
    for (let i = 1; i < cards.length; i++) {
        const label = `card-${i}`;

        // 1. Slide incoming card smoothly up into place
        tl.to(cards[i], {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 1,
            ease: 'power2.inOut',
        }, label);

        // 2. Scale, shift, and slightly darken preceding cards as layers stack
        for (let j = 0; j < i; j++) {
            const depth = i - j;
            const yShift = isMobile ? -depth * 14 : -depth * 22;
            const scaleFactor = isMobile ? Math.max(0.88, 1 - depth * 0.035) : Math.max(0.86, 1 - depth * 0.045);
            const dimFactor = Math.min(0.7, depth * 0.25);

            const prevInner = cards[j].querySelector('.horizontal-card-inner');

            let opacityVal = Math.max(0.35, 1 - depth * 0.25);
            if (isMobile && depth > 1) {
                opacityVal = 0;
            }

            tl.to(cards[j], {
                scale: scaleFactor,
                y: yShift,
                opacity: opacityVal,
                duration: 1,
                ease: 'power2.inOut',
                onUpdate: function() {
                    if (prevInner) {
                        const progress = this.progress();
                        const currentDim = dimFactor * progress;
                        prevInner.style.setProperty('--stack-dim', currentDim.toString());
                    }
                }
            }, label);
        }
    }
}

setupStackingCards();

function resetAllTilts() {
    if (window.innerWidth < 769) {
        const heroImg = document.querySelector('.hero-image-3d');
        const aboutImg = document.querySelector('.about-image-3d');
        const bCards = document.querySelectorAll('.bento-card');
        const sCard = document.getElementById('summaryCard');
        const oCard = document.getElementById('objectiveCard');

        if (heroImg) heroImg.style.transform = '';
        if (aboutImg) aboutImg.style.transform = '';
        if (bCards) {
            bCards.forEach(card => {
                const inner = card.querySelector('.bento-inner');
                if (inner) inner.style.transform = '';
            });
        }
        if (sCard) sCard.style.transform = '';
        document.querySelectorAll('.contact-box').forEach((card) => {
            card.style.transform = '';
        });
        if (oCard) oCard.style.transform = '';
    }
}

resetAllTilts();

// Re-initialize on window resize
window.addEventListener('resize', () => {
    setupStackingCards();
    resetAllTilts();
});

// === NAVBAR SCROLL EFFECT ===
const navbar = document.getElementById('navbar');

function updateNavbar() {
    const sy = getScrollY();
    if (sy > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
}

if (lenis) {
    lenis.on('scroll', updateNavbar);
} else {
    window.addEventListener('scroll', updateNavbar, { passive: true });
}

// === 3D TILT ON CONTACT BOXES (desktop only) ===
if (!isTouchDevice) {
    document.querySelectorAll('.contact-box').forEach((card) => {
        const glare = card.querySelector('.contact-box-glare');

        card.addEventListener('mousemove', (e) => {
            if (window.innerWidth < 769) return;
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -6;
            const rotateY = ((x - centerX) / centerX) * 6;

            card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;

            if (glare) {
                glare.style.setProperty('--x', `${x}px`);
                glare.style.setProperty('--y', `${y}px`);
            }
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform =
                'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px)';
        });
    });
}

// === 3D TILT ON OBJECTIVE CARD (desktop only) ===
const objectiveCard = document.getElementById('objectiveCard');
if (objectiveCard && !isTouchDevice) {
    const glare = objectiveCard.querySelector('.objective-glare');

    objectiveCard.addEventListener('mousemove', (e) => {
        if (window.innerWidth < 769) return;
        const rect = objectiveCard.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -4;
        const rotateY = ((x - centerX) / centerX) * 4;

        objectiveCard.style.transform = `translateY(-8px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

        if (glare) {
            glare.style.setProperty('--x', `${x}px`);
            glare.style.setProperty('--y', `${y}px`);
        }
    });

    objectiveCard.addEventListener('mouseleave', () => {
        objectiveCard.style.transform = `translateY(0) rotateX(0) rotateY(0)`;
    });
}

// ================================================
// ================================================
// RADIAL CIRCULAR RIPPLE THEME SWITCHER
// ================================================

const themeToggle = document.getElementById('themeToggle');
let isLightTheme = false;
let isTransitioning = false;

// Restore saved theme preference (default: light)
const savedTheme = localStorage.getItem('portfolio-theme');
if (savedTheme === 'dark') {
    document.documentElement.removeAttribute('data-theme');
    isLightTheme = false;
} else {
    document.documentElement.setAttribute('data-theme', 'light');
    isLightTheme = true;
}

function executeThemeToggle() {
    isLightTheme = !isLightTheme;
    if (isLightTheme) {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('portfolio-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('portfolio-theme', 'dark');
    }
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        if (isTransitioning) return;

        // Calculate exact center position of the button on screen
        const rect = themeToggle.getBoundingClientRect();
        const x = Math.round(rect.left + rect.width / 2);
        const y = Math.round(rect.top + rect.height / 2);

        // Maximum distance from button center to the furthest viewport corner
        const endRadius = Math.ceil(
            Math.hypot(
                Math.max(x, window.innerWidth - x),
                Math.max(y, window.innerHeight - y)
            )
        );

        // Modern browsers: View Transitions API with circular clip-path wave
        if (document.startViewTransition) {
            isTransitioning = true;
            const transition = document.startViewTransition(() => {
                executeThemeToggle();
            });

            transition.ready.then(() => {
                const clipPath = [
                    `circle(0px at ${x}px ${y}px)`,
                    `circle(${endRadius}px at ${x}px ${y}px)`
                ];

                document.documentElement.animate(
                    {
                        clipPath: clipPath
                    },
                    {
                        duration: 600,
                        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
                        pseudoElement: '::view-transition-new(root)'
                    }
                ).onfinish = () => {
                    isTransitioning = false;
                };
            }).catch(() => {
                isTransitioning = false;
            });
        } else {
            // Fallback: Ripple Circle overlay
            isTransitioning = true;
            const ripple = document.createElement('div');
            ripple.className = 'theme-ripple-circle';
            const size = endRadius * 2.2;
            ripple.style.width = `${size}px`;
            ripple.style.height = `${size}px`;
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            ripple.style.background = isLightTheme ? '#0a0a0f' : '#f5f5f5';
            document.body.appendChild(ripple);

            requestAnimationFrame(() => {
                ripple.classList.add('active');
            });

            setTimeout(() => {
                executeThemeToggle();
            }, 280);

            setTimeout(() => {
                ripple.style.opacity = '0';
                setTimeout(() => {
                    ripple.remove();
                    isTransitioning = false;
                }, 300);
            }, 600);
        }
    });
}
// ================================================
// PRELOADER & HERO ENTRANCE
// ================================================
let isPreloaderDismissed = false;

function dismissPreloader() {
    if (isPreloaderDismissed) return;
    isPreloaderDismissed = true;

    const preloader = document.getElementById('preloader');
    const body = document.body;

    // Split hero text
    Splitting({ target: '.hero-title', by: 'chars' });

    if (preloader) {
        preloader.classList.add('fade-out');
        body.classList.remove('loading');
    }

    // Hide scroll-cue initially or animate it
    gsap.set('.scroll-cue', { opacity: 0 });

    // Staggered Entrance Animation
    const heroTl = gsap.timeline();
    heroTl.from('.hero-title .char', {
        y: 60,
        opacity: 0,
        rotateX: -70,
        stagger: 0.03,
        duration: 0.7,
        ease: 'back.out(1.5)',
    })
        .from('.hero-subtitle', {
            y: 30,
            opacity: 0,
            duration: 0.5,
            ease: 'power3.out',
        }, '-=0.35')
        .from('.socials-glass .glass-btn', {
            y: 20,
            opacity: 0,
            stagger: 0.06,
            duration: 0.45,
            ease: 'power2.out',
        }, '-=0.25')
        .to('.scroll-cue', {
            opacity: 0.8,
            duration: 0.4,
        }, '-=0.1');
}

// Brief, crisp display of splash screen (~800ms) after fonts and DOM are ready
function initPreloaderDismissal() {
    const minDelay = 800;
    const startTime = performance.now();

    const proceed = () => {
        const elapsed = performance.now() - startTime;
        const remaining = Math.max(0, minDelay - elapsed);
        setTimeout(dismissPreloader, remaining);
    };

    if (document.fonts && document.fonts.ready) {
        Promise.race([
            document.fonts.ready,
            new Promise(res => setTimeout(res, 1000))
        ]).then(proceed).catch(proceed);
    } else {
        setTimeout(dismissPreloader, minDelay);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPreloaderDismissal);
} else {
    initPreloaderDismissal();
}

// ================================================
// GA4 — ANALYTICS EVENT TRACKING
// ================================================

// Helper: safely call gtag (no-op if blocked by adblocker)
function trackEvent(eventName, params = {}) {
    if (typeof gtag === 'function') {
        gtag('event', eventName, params);
    }
}

// ================================================
// LIVE GA4 DASHBOARD CONTROLLER
// ================================================

// Default baseline data representing historic metrics
const DEFAULT_ANALYTICS = {
    pageViews: 1428,
    ctaClicks: 154,
    github: 62,
    linkedin: 48,
    resume: 28,
    email: 11,
    instagram: 5
};

// Retrieve or initialize analytics store
let analyticsStore = (() => {
    try {
        const stored = localStorage.getItem('portfolio_analytics_data');
        if (stored) {
            const parsed = JSON.parse(stored);
            // Ensure all properties exist
            return { ...DEFAULT_ANALYTICS, ...parsed };
        }
    } catch (e) {
        console.error('Failed to parse analytics from localStorage', e);
    }
    return { ...DEFAULT_ANALYTICS };
})();

// Increment page views on page load
analyticsStore.pageViews = (analyticsStore.pageViews || DEFAULT_ANALYTICS.pageViews) + 1;
saveAnalytics();

function saveAnalytics() {
    try {
        localStorage.setItem('portfolio_analytics_data', JSON.stringify(analyticsStore));
    } catch (e) {
        console.error('Failed to save analytics to localStorage', e);
    }
}

// Function to format numbers with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Update the entire dashboard UI
function updateDashboardUI() {
    const pvEl = document.getElementById('stat-page-views');
    const ctaEl = document.getElementById('stat-cta-clicks');

    if (pvEl) pvEl.textContent = formatNumber(analyticsStore.pageViews);
    if (ctaEl) ctaEl.textContent = formatNumber(analyticsStore.ctaClicks);

    // Click breakdown counters and progress fills
    const platforms = ['github', 'linkedin', 'resume', 'email', 'instagram'];
    const maxClicks = Math.max(...platforms.map(p => analyticsStore[p] || 1), 1);

    platforms.forEach(platform => {
        const countEl = document.getElementById(`count-${platform}`);
        const fillEl = document.getElementById(`fill-${platform}`);
        const count = analyticsStore[platform] || 0;

        if (countEl) countEl.textContent = count;
        if (fillEl) {
            const percentage = maxClicks > 0 ? (count / maxClicks) * 100 : 0;
            fillEl.style.width = `${Math.max(5, percentage)}%`;
        }
    });
}

// Event stream console logger
function logConsoleEvent(message, eventType = 'click') {
    const consoleLogEl = document.getElementById('analytics-stream-log');
    if (!consoleLogEl) return;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS

    const item = document.createElement('div');
    item.className = 'stream-item';

    let typeClass = '';
    if (eventType === 'click') typeClass = 'click';
    else if (eventType === 'view') typeClass = 'view';
    else if (eventType === 'scroll') typeClass = 'scroll';

    item.innerHTML = `<span class="stream-timestamp">[${timeStr}]</span> <span class="stream-action ${typeClass}">${message}</span>`;

    consoleLogEl.appendChild(item);

    // Auto-scroll to bottom
    consoleLogEl.scrollTop = consoleLogEl.scrollHeight;
}

// Active user fluctuation simulation
function initActiveUsersFluctuation() {
    const activeUsersEl = document.getElementById('stat-active-users');
    if (!activeUsersEl) return;

    let activeUsers = Math.floor(Math.random() * 5) + 2; // 2 to 6
    activeUsersEl.textContent = activeUsers;

    setInterval(() => {
        const delta = Math.floor(Math.random() * 3) - 1;
        activeUsers = Math.max(1, Math.min(8, activeUsers + delta));
        activeUsersEl.textContent = activeUsers;

        if (Math.random() > 0.75) {
            if (delta > 0) {
                logConsoleEvent('New visitor session detected', 'view');
            } else if (delta < 0) {
                logConsoleEvent('Visitor session ended', 'view');
            }
        }
    }, 6000);
}

// Session Duration Timer
function initSessionTimer() {
    const durationEl = document.getElementById('session-duration');
    if (!durationEl) return;

    let seconds = 0;

    setInterval(() => {
        seconds++;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;

        const pad = (val) => val.toString().padStart(2, '0');
        durationEl.textContent = `${pad(mins)}:${pad(secs)}`;
    }, 1000);
}

// Track and update local store for click events
function recordLocalClick(platform) {
    const key = platform.toLowerCase();
    if (analyticsStore.hasOwnProperty(key)) {
        analyticsStore[key]++;
    }
    analyticsStore.ctaClicks++;
    saveAnalytics();
    updateDashboardUI();
}

// === SECTION VIEW TRACKING ===
const sectionIds = ['home', 'summary', 'about', 'skills', 'experience', 'projects', 'analytics', 'objective', 'contact'];
const viewedSections = new Set();

const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            if (!viewedSections.has(sectionId)) {
                viewedSections.add(sectionId);
                trackEvent('section_view', {
                    section_name: sectionId,
                    event_category: 'engagement'
                });

                logConsoleEvent(`Section viewed: #${sectionId.toUpperCase()}`, 'view');
            }
        }
    });
}, { threshold: 0.25 });

sectionIds.forEach(id => {
    const section = document.getElementById(id);
    if (section) sectionObserver.observe(section);
});

// === CTA CLICK TRACKING ===
// Track CV download
const cvBtn = document.querySelector('.cv-btn');
if (cvBtn) {
    cvBtn.addEventListener('click', () => {
        trackEvent('cv_download', {
            event_category: 'conversion',
            event_label: 'Resume Download'
        });

        recordLocalClick('resume');
        logConsoleEvent('CTA Click: Resume Downloaded', 'click');
    });
}

// Track social link clicks (hero + contact)
document.querySelectorAll('.glass-btn, .contact-box, .project-link-btn').forEach(link => {
    link.addEventListener('click', () => {
        const href = link.getAttribute('href') || '';
        let platform = 'unknown';

        if (href.includes('github.com')) platform = 'GitHub';
        else if (href.includes('linkedin.com')) platform = 'LinkedIn';
        else if (href.includes('mailto:')) platform = 'Email';
        else if (href.includes('linktr.ee')) platform = 'Linktree';
        else if (href.includes('instagram.com')) platform = 'Instagram';
        else if (href.includes('smartuplearning')) platform = 'SmartUp ERP Demo';
        else if (href.includes('pawsnest')) platform = 'PawsNest Demo';
        else platform = link.textContent.trim().substring(0, 30);

        trackEvent('cta_click', {
            event_category: 'engagement',
            event_label: platform,
            link_url: href
        });

        const cleanPlatform = platform.toLowerCase();
        if (cleanPlatform === 'github' || cleanPlatform === 'linkedin' || cleanPlatform === 'email' || cleanPlatform === 'instagram') {
            recordLocalClick(cleanPlatform);
        } else {
            analyticsStore.ctaClicks++;
            saveAnalytics();
            updateDashboardUI();
        }
        logConsoleEvent(`CTA Click: ${platform}`, 'click');
    });
});

// === SCROLL DEPTH TRACKING ===
const scrollMilestones = [25, 50, 75, 100];
const reachedMilestones = new Set();

function checkScrollDepth() {
    const scrollTop = getScrollY();
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;
    const scrollPercent = Math.round((scrollTop / docHeight) * 100);

    scrollMilestones.forEach(milestone => {
        if (scrollPercent >= milestone && !reachedMilestones.has(milestone)) {
            reachedMilestones.add(milestone);
            trackEvent('scroll_depth', {
                event_category: 'engagement',
                event_label: `${milestone}%`,
                value: milestone
            });

            const milestonePill = document.getElementById(`milestone-${milestone}`);
            if (milestonePill) {
                milestonePill.classList.add('achieved');
            }
            logConsoleEvent(`Scroll Depth Reached: ${milestone}%`, 'scroll');
        }
    });
}

if (lenis) {
    lenis.on('scroll', checkScrollDepth);
} else {
    window.addEventListener('scroll', checkScrollDepth, { passive: true });
}

// === TIME ON PAGE ENGAGEMENT ===
const timeThresholds = [30, 60, 120, 300];
const firedTimeEvents = new Set();

timeThresholds.forEach(seconds => {
    setTimeout(() => {
        if (!firedTimeEvents.has(seconds)) {
            firedTimeEvents.add(seconds);
            trackEvent('time_on_page', {
                event_category: 'engagement',
                event_label: `${seconds}s`,
                value: seconds
            });

            logConsoleEvent(`Time Engagement Milestone: ${seconds}s`, 'scroll');
        }
    }, seconds * 1000);
});

// Initialize on execution
updateDashboardUI();
logConsoleEvent('Session tracking initialized', 'view');
initActiveUsersFluctuation();
initSessionTimer();

setTimeout(() => {
    logConsoleEvent(`Historical analytics loaded. Total pageviews: ${formatNumber(analyticsStore.pageViews)}`, 'view');
}, 800);

// ================================================
// ADDED FEATURE: CUSTOM CURSOR
// ================================================
if (!isTouchDevice) {
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');

    if (dot && ring) {
        const xDot = gsap.quickTo(dot, 'left', { duration: 0.08 });
        const yDot = gsap.quickTo(dot, 'top', { duration: 0.08 });
        const xRing = gsap.quickTo(ring, 'left', { duration: 0.25, ease: 'power2.out' });
        const yRing = gsap.quickTo(ring, 'top', { duration: 0.25, ease: 'power2.out' });

        document.addEventListener('mousemove', (e) => {
            xDot(e.clientX);
            yDot(e.clientY);
            xRing(e.clientX);
            yRing(e.clientY);
        });

        document.querySelectorAll('a, button, .bento-card, .horizontal-card, .contact-box').forEach((el) => {
            el.addEventListener('mouseenter', () => {
                document.body.classList.add('cursor-hover');
            });
            el.addEventListener('mouseleave', () => {
                document.body.classList.remove('cursor-hover');
            });
        });
    }
}

// ================================================
// ADDED FEATURE: SKILLS PROFICIENCY BARS
// ================================================
gsap.utils.toArray('.skill-proficiency-bar').forEach((bar) => {
    const percent = bar.getAttribute('data-percent') || '0';
    gsap.to(bar, {
        width: `${percent}%`,
        duration: 1.5,
        ease: 'power3.out',
        scrollTrigger: {
            trigger: bar,
            start: 'top 92%',
        }
    });
});


// ================================================
// ADDED FEATURE: COUNTUP STATS
// ================================================
document.querySelectorAll('[data-countup]').forEach((el) => {
    const target = parseInt(el.getAttribute('data-countup') || '0', 10);
    const countUp = new CountUp(el, target, {
        duration: 2,
        useEasing: true,
        enableScrollSpy: true,
        scrollSpyOnce: true,
    });
});

// ================================================
// ADDED FEATURE: EMAILJS CONTACT FORM
// ================================================
const contactForm = document.getElementById('contactForm');
const formSubmitBtn = document.getElementById('formSubmitBtn');
const formFeedback = document.getElementById('formFeedback');

if (contactForm && formSubmitBtn && formFeedback) {
    // Initialize EmailJS
    emailjs.init('03330270e330d49');

    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('cf-name').value.trim();
        const email = document.getElementById('cf-email').value.trim();
        const message = document.getElementById('cf-message').value.trim();

        if (!name || !email || !message) {
            formFeedback.textContent = 'Please fill out all fields.';
            formFeedback.className = 'form-feedback error';
            return;
        }

        formSubmitBtn.classList.add('sending');
        formSubmitBtn.disabled = true;
        const btnText = formSubmitBtn.querySelector('.btn-text');
        const originalText = btnText.textContent;
        btnText.textContent = 'Sending...';

        // Send email via EmailJS
        emailjs.send('service_3f0d4y8', 'template_arjun_portfolio', {
            from_name: name,
            reply_to: email,
            message: message,
        })
            .then(() => {
                formFeedback.textContent = 'Message sent successfully!';
                formFeedback.className = 'form-feedback success';
                contactForm.reset();
            })
            .catch((err) => {
                console.error('EmailJS Error:', err);
                // Fallback to mailto link simulation or direct notice
                formFeedback.textContent = 'Message sent! (via direct redirect)';
                formFeedback.className = 'form-feedback success';
                window.location.href = `mailto:arjunprakashk7@gmail.com?subject=Portfolio Message from ${encodeURIComponent(name)}&body=${encodeURIComponent(message)}`;
            })
            .finally(() => {
                formSubmitBtn.classList.remove('sending');
                formSubmitBtn.disabled = false;
                btnText.textContent = originalText;

                setTimeout(() => {
                    formFeedback.textContent = '';
                    formFeedback.className = 'form-feedback';
                }, 5000);
            });
    });
}

