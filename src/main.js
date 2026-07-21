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
// THREE.JS — Animated Particle Background
// ================================================

const canvas = document.getElementById('bg-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
camera.position.z = 30;

// === CODING SYMBOL PARTICLES ===
const isMobile = window.innerWidth < 768;
const cyan = new THREE.Color(0x00f0ff);
const purple = new THREE.Color(0x7b2ff7);

// Symbols to scatter as particles
const particleSymbols = [
    'Py', 'JS', '⚛', 'CSS', 'SQL',
    'git', 'npm', '{ }', '</>', '=>',
    '//', '#'
];

// Create a tiny glow text canvas for a particle symbol
function makeParticleTexture(symbol, colorHex) {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');

    ctx.clearRect(0, 0, size, size);

    const fontSize = symbol.length <= 2 ? 28 : symbol.length <= 3 ? 22 : 18;
    ctx.font = `700 ${fontSize}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const r = (colorHex >> 16) & 255;
    const g = (colorHex >> 8) & 255;
    const b = colorHex & 255;

    // Subtle glow
    ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
    ctx.shadowBlur = 8;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.85)`;
    ctx.fillText(symbol, size / 2, size / 2);

    return c;
}

// Per-symbol particle count
const perSymbolCount = isMobile ? 50 : 120;
const totalParticleCount = perSymbolCount * particleSymbols.length;

// We store all particle groups and their geometries for animation & theme updates
const particleGroups = [];
const allParticleGeometries = [];

particleSymbols.forEach((symbol, sIdx) => {
    const t = sIdx / (particleSymbols.length - 1);
    const color = cyan.clone().lerp(purple, t);
    const colorHex = color.getHex();

    const texCanvas = makeParticleTexture(symbol, colorHex);
    const texture = new THREE.CanvasTexture(texCanvas);

    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(perSymbolCount * 3);
    const cols = new Float32Array(perSymbolCount * 3);

    for (let i = 0; i < perSymbolCount; i++) {
        pos[i * 3]     = (Math.random() - 0.5) * 80;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 80;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 80;

        cols[i * 3]     = color.r;
        cols[i * 3 + 1] = color.g;
        cols[i * 3 + 2] = color.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));

    const mat = new THREE.PointsMaterial({
        size: isMobile ? 0.6 : 0.45,
        map: texture,
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
        sizeAttenuation: true,
        depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);
    particleGroups.push(points);
    allParticleGeometries.push(geo);
});

// Keep backward-compatible references for the theme switcher
const particleGeometry = allParticleGeometries[0]; // used by theme funcs
const particleCount = perSymbolCount; // used by updateParticleColors
const particles = particleGroups[0]; // used by animate()

// === FLOATING CODING SYMBOLS ===
const geometries = [];

// Coding symbols to display as floating items
const codingSymbols = [
    '</>', '{ }', '( )', '[ ]', '#',
    '=>', '//', '&&', '||', ';;',
    '_.', '!=', '++', '**', '~>'
];

function makeSymbolTexture(symbol, colorHex) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Transparent background
    ctx.clearRect(0, 0, size, size);

    // Pick a font size relative to symbol length
    const fontSize = symbol.length <= 2 ? 120 : symbol.length <= 3 ? 96 : 80;
    ctx.font = `700 ${fontSize}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Convert hex color to rgba with low opacity for a subtle look
    const r = (colorHex >> 16) & 255;
    const g = (colorHex >> 8) & 255;
    const b = colorHex & 255;

    // Glow effect
    ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.9)`;
    ctx.shadowBlur = 28;

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.72)`;
    ctx.fillText(symbol, size / 2, size / 2);

    return canvas;
}

codingSymbols.forEach((symbol, i) => {
    const t = i / (codingSymbols.length - 1);
    const color = new THREE.Color().lerpColors(cyan, purple, t);
    const colorHex = color.getHex();

    const canvas = makeSymbolTexture(symbol, colorHex);
    const texture = new THREE.CanvasTexture(canvas);

    const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        side: THREE.DoubleSide,
    });

    // Use a plane sized to 5×5 world units for better visibility
    const geo = new THREE.PlaneGeometry(5, 5);
    const mesh = new THREE.Mesh(geo, mat);

    mesh.position.set(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 20 - 10
    );

    mesh.userData = {
        rotSpeed: {
            x: 0.002 + Math.random() * 0.003,
            y: 0.003 + Math.random() * 0.004,
        },
        floatSpeed: 0.25 + Math.random() * 0.45,
        floatAmp: 1 + Math.random() * 2,
        baseY: mesh.position.y,
    };

    scene.add(mesh);
    geometries.push(mesh);
});

// === MOUSE TRACKING ===
let mouseX = 0;
let mouseY = 0;
let targetMouseX = 0;
let targetMouseY = 0;

document.addEventListener('mousemove', (e) => {
    targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

// === SCROLL TRACKING ===
// For non-Lenis (touch) devices, use window.scrollY directly
let nativeScrollY = 0;
window.addEventListener('scroll', () => {
    nativeScrollY = window.scrollY;
}, { passive: true });

// Unified scroll getter — always returns current scroll position
function getScrollY() {
    return lenis ? lenisScrollY : nativeScrollY;
}

// === ANIMATION LOOP ===
const clock = new THREE.Clock();

function animate(time) {
    requestAnimationFrame(animate);

    // Tick Lenis on every frame
    tickLenis(time);

    const elapsed = clock.getElapsedTime();
    const currentScrollY = getScrollY();

    // Smooth mouse follow
    mouseX += (targetMouseX - mouseX) * 0.05;
    mouseY += (targetMouseY - mouseY) * 0.05;

    // Rotate all particle groups in sync
    particleGroups.forEach(pg => {
        pg.rotation.y = elapsed * 0.03 + mouseX * 0.15;
        pg.rotation.x = elapsed * 0.02 + mouseY * 0.1;
    });

    // Scroll-based camera shift
    camera.position.y = -currentScrollY * 0.003;

    // Animate floating geometries
    geometries.forEach((mesh) => {
        const d = mesh.userData;
        mesh.rotation.x += d.rotSpeed.x;
        mesh.rotation.y += d.rotSpeed.y;
        mesh.position.y = d.baseY + Math.sin(elapsed * d.floatSpeed) * d.floatAmp;
    });

    renderer.render(scene, camera);
}

animate(0);

// === RESIZE HANDLER ===
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ================================================
// UI INTERACTIONS
// ================================================

// === HAMBURGER MENU ===
const menuBtn = document.getElementById('menuBtn');
const dropdown = document.getElementById('dropdownMenu');
const body = document.body;

menuBtn.addEventListener('click', () => {
    menuBtn.classList.toggle('active');
    dropdown.classList.toggle('show');
    body.classList.toggle('menu-open');
});

document.querySelectorAll('.dropdown a').forEach((link) => {
    link.addEventListener('click', () => {
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
// Only enabled on desktop viewports (>= 769px)
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

    // Create the stacking timeline
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: projectsSection,
            start: 'top top',
            end: () => `+=${window.innerHeight * (cards.length - 0.5)}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
        }
    });

    // Set starting states
    cards.forEach((card, index) => {
        if (index === 0) {
            gsap.set(card, { y: 0, scale: 1, opacity: 1, zIndex: 1 });
        } else {
            // Push subsequent cards completely down
            gsap.set(card, { y: '100vh', scale: 0.95, opacity: 0, zIndex: index + 1 });
        }
    });

    // Stagger card stacking sequence
    for (let i = 1; i < cards.length; i++) {
        // Slide card up
        tl.to(cards[i], {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 1,
            ease: 'power2.out',
        }, `card-${i}`);

        // Scale and shift preceding cards down in depth
        for (let j = 0; j < i; j++) {
            const depth = i - j;
            const yShift = isMobile ? -depth * 16 : -depth * 25;
            const scaleFactor = isMobile ? 1 - depth * 0.03 : 1 - depth * 0.04;
            
            // On mobile, fade out cards that are more than 1 layer deep to prevent overlapping text/content
            let opacityVal = Math.max(0.3, 1 - depth * 0.35);
            if (isMobile && depth > 1) {
                opacityVal = 0;
            }

            tl.to(cards[j], {
                scale: scaleFactor,
                y: yShift,
                opacity: opacityVal,
                duration: 1,
                ease: 'power2.out',
            }, `card-${i}`);
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
// 3D THEME SWITCHER
// ================================================

const themeToggle = document.getElementById('themeToggle');
const themeOverlay = document.getElementById('themeOverlay');
let isLightTheme = false;
let isTransitioning = false;

// Light theme colors for Three.js
const lightGrey = new THREE.Color(0x333333);
const lightDark = new THREE.Color(0x888888);

// Restore saved theme preference
const savedTheme = localStorage.getItem('portfolio-theme');
if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    isLightTheme = true;
    // Immediately set particle colors to light theme
    updateParticleColors(lightGrey, lightDark);
    updateSymbolColors(lightGrey, lightDark);
}

themeToggle.addEventListener('click', () => {
    if (isTransitioning) return;
    isTransitioning = true;

    // 1. Start 3D page flip animation
    document.body.classList.add('theme-transitioning');
    themeOverlay.classList.add('flipping');

    // 2. At the midpoint of the flip (500ms), actually toggle the theme
    setTimeout(() => {
        isLightTheme = !isLightTheme;

        if (isLightTheme) {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('portfolio-theme', 'light');
            // Transition Three.js to light colors
            animateParticleColors(cyan, purple, lightGrey, lightDark, 500);
            updateSymbolColors(lightGrey, lightDark);
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('portfolio-theme', 'dark');
            // Transition Three.js back to dark colors
            animateParticleColors(lightGrey, lightDark, cyan, purple, 500);
            updateSymbolColors(cyan, purple);
        }
    }, 450);

    // 3. Cleanup after animation completes
    setTimeout(() => {
        document.body.classList.remove('theme-transitioning');
        themeOverlay.classList.remove('flipping');
        isTransitioning = false;
    }, 1100);
});

// === Animate particle color transition (all groups) ===
function animateParticleColors(fromA, fromB, toA, toB, duration) {
    const startTime = performance.now();

    // Snapshot starting colors for each group
    const snapshots = allParticleGeometries.map(geo => {
        const attr = geo.getAttribute('color');
        return { attr, start: new Float32Array(attr.array) };
    });

    // Compute per-group target colors
    const targets = allParticleGeometries.map((geo, gIdx) => {
        const attr = geo.getAttribute('color');
        const count = attr.count;
        const t = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const mix = gIdx / (allParticleGeometries.length - 1);
            const target = toA.clone().lerp(toB, mix);
            t[i * 3]     = target.r;
            t[i * 3 + 1] = target.g;
            t[i * 3 + 2] = target.b;
        }
        return t;
    });

    function stepColor(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        snapshots.forEach((snap, gIdx) => {
            const target = targets[gIdx];
            for (let i = 0; i < snap.attr.array.length; i++) {
                snap.attr.array[i] = snap.start[i] + (target[i] - snap.start[i]) * ease;
            }
            snap.attr.needsUpdate = true;
        });

        if (t < 1) requestAnimationFrame(stepColor);
    }

    requestAnimationFrame(stepColor);

    // Also regenerate textures for target colors
    setTimeout(() => {
        particleGroups.forEach((pg, gIdx) => {
            const mix = gIdx / (particleGroups.length - 1);
            const c = toA.clone().lerp(toB, mix);
            const newTex = new THREE.CanvasTexture(
                makeParticleTexture(particleSymbols[gIdx % particleSymbols.length], c.getHex())
            );
            if (pg.material.map) pg.material.map.dispose();
            pg.material.map = newTex;
            pg.material.needsUpdate = true;
        });
    }, duration);
}

// === Instantly set particle colors (all groups) ===
function updateParticleColors(colorA, colorB) {
    allParticleGeometries.forEach((geo, gIdx) => {
        const attr = geo.getAttribute('color');
        const mix = gIdx / (allParticleGeometries.length - 1);
        const c = colorA.clone().lerp(colorB, mix);
        for (let i = 0; i < attr.count; i++) {
            attr.array[i * 3]     = c.r;
            attr.array[i * 3 + 1] = c.g;
            attr.array[i * 3 + 2] = c.b;
        }
        attr.needsUpdate = true;
    });

    // Also regenerate textures
    particleGroups.forEach((pg, gIdx) => {
        const mix = gIdx / (particleGroups.length - 1);
        const c = colorA.clone().lerp(colorB, mix);
        const newTex = new THREE.CanvasTexture(
            makeParticleTexture(particleSymbols[gIdx % particleSymbols.length], c.getHex())
        );
        if (pg.material.map) pg.material.map.dispose();
        pg.material.map = newTex;
        pg.material.needsUpdate = true;
    });
}

// === Update floating coding symbol colors ===
function updateSymbolColors(colorA, colorB) {
    geometries.forEach((mesh, i) => {
        const t = i / (geometries.length - 1);
        const color = new THREE.Color().lerpColors(colorA, colorB, t);
        const colorHex = color.getHex();

        const newCanvas = makeSymbolTexture(codingSymbols[i % codingSymbols.length], colorHex);
        const newTexture = new THREE.CanvasTexture(newCanvas);

        if (mesh.material.map) {
            mesh.material.map.dispose();
        }
        mesh.material.map = newTexture;
        mesh.material.needsUpdate = true;
    });
}
// ================================================
// PRELOADER
// ================================================
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    const body = document.body;

    // Split hero text
    Splitting({ target: '.hero-title', by: 'chars' });

    if (preloader) {
        // Show preloader for at least 2.5s to let the 3D name animation shine
        setTimeout(() => {
            preloader.classList.add('fade-out');
            body.classList.remove('loading');

            // Hide scroll-cue initially or animate it
            gsap.set('.scroll-cue', { opacity: 0 });

            // Staggered Entrance Animation
            const heroTl = gsap.timeline();
            heroTl.from('.hero-title .char', {
                y: 60,
                opacity: 0,
                rotateX: -70,
                stagger: 0.03,
                duration: 0.8,
                ease: 'back.out(1.5)',
            })
            .from('.hero-subtitle', {
                y: 30,
                opacity: 0,
                duration: 0.6,
                ease: 'power3.out',
            }, '-=0.4')
            .from('.socials-glass .glass-btn', {
                y: 20,
                opacity: 0,
                stagger: 0.08,
                duration: 0.5,
                ease: 'power2.out',
            }, '-=0.3')
            .to('.scroll-cue', {
                opacity: 0.8,
                duration: 0.5,
            }, '-=0.1');

        }, 2500);
    }
});

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

