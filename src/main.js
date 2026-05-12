/* ================================================
   MAIN.JS — Three.js Scene + UI Interactions
   Portfolio 3D — Vite + Three.js
================================================ */

import * as THREE from 'three';

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
let scrollY = 0;
window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
});

// === ANIMATION LOOP ===
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();

    // Smooth mouse follow
    mouseX += (targetMouseX - mouseX) * 0.05;
    mouseY += (targetMouseY - mouseY) * 0.05;

    // Rotate all particle groups in sync
    particleGroups.forEach(pg => {
        pg.rotation.y = elapsed * 0.03 + mouseX * 0.15;
        pg.rotation.x = elapsed * 0.02 + mouseY * 0.1;
    });

    // Scroll-based camera shift
    camera.position.y = -scrollY * 0.003;

    // Animate floating geometries
    geometries.forEach((mesh) => {
        const d = mesh.userData;
        mesh.rotation.x += d.rotSpeed.x;
        mesh.rotation.y += d.rotSpeed.y;
        mesh.position.y = d.baseY + Math.sin(elapsed * d.floatSpeed) * d.floatAmp;
    });

    renderer.render(scene, camera);
}

animate();

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

// === SCROLL REVEAL (Intersection Observer) ===
const revealElements = document.querySelectorAll(
    '.reveal, .reveal-left, .reveal-right'
);

const revealObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    },
    {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
    }
);

revealElements.forEach((el) => revealObserver.observe(el));

// === TIMELINE ROUTE MAP — Scroll Reveal ===
const timelineEntries = document.querySelectorAll('.timeline-entry');

const timelineObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                // Stagger based on data-timeline attribute
                const delay = (parseInt(entry.target.dataset.timeline) || 1) * 150;
                setTimeout(() => {
                    entry.target.classList.add('timeline-visible');
                }, delay);
                timelineObserver.unobserve(entry.target);
            }
        });
    },
    {
        threshold: 0.15,
        rootMargin: '0px 0px -80px 0px',
    }
);

timelineEntries.forEach((el) => timelineObserver.observe(el));

// === TIMELINE TRACK FILL — Scroll-Driven Line ===
const timelineTrackFill = document.getElementById('timelineTrackFill');
const timelineSection = document.getElementById('timeline');

if (timelineTrackFill && timelineSection) {
    const updateTrackFill = () => {
        const rect = timelineSection.getBoundingClientRect();
        const sectionTop = rect.top;
        const sectionHeight = rect.height;
        const viewportHeight = window.innerHeight;

        // Start filling when the timeline enters the viewport
        // Fully filled when the bottom of the timeline reaches the center of the viewport
        const startOffset = viewportHeight * 0.75;
        const scrolledInto = startOffset - sectionTop;
        const totalDistance = sectionHeight + startOffset - viewportHeight * 0.3;

        let progress = scrolledInto / totalDistance;
        progress = Math.max(0, Math.min(1, progress));

        timelineTrackFill.style.height = `${progress * 100}%`;
    };

    window.addEventListener('scroll', updateTrackFill, { passive: true });
    updateTrackFill(); // Initial check
}

// === HERO — 3D Image Tilt ===
const heroImageWrapper = document.querySelector('.hero-image-wrapper');
const heroImage3d = document.querySelector('.hero-image-3d');
const heroGlare = document.querySelector('.hero-image-glare');

if (heroImageWrapper && heroImage3d) {
    heroImageWrapper.addEventListener('mousemove', (e) => {
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

// === ABOUT — 3D Image Tilt ===
const aboutImageWrapper = document.querySelector('.about-image-wrapper');
const aboutImage3d = document.querySelector('.about-image-3d');
const aboutGlare = document.querySelector('.about-image-glare');

if (aboutImageWrapper && aboutImage3d) {
    aboutImageWrapper.addEventListener('mousemove', (e) => {
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

// === SKILLS 3D BENTO EFFECT ===
const bentoCards = document.querySelectorAll('.bento-card');

bentoCards.forEach(card => {
    const inner = card.querySelector('.bento-inner');
    const glare = card.querySelector('.bento-glare');
    
    card.addEventListener('mousemove', (e) => {
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

// === 3D TILT ON SUMMARY CARD ===
const summaryCard = document.getElementById('summaryCard');
if (summaryCard) {
    const glare = summaryCard.querySelector('.summary-glare');
    
    summaryCard.addEventListener('mousemove', (e) => {
        const rect = summaryCard.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((y - centerY) / centerY) * -4;
        const rotateY = ((x - centerX) / centerX) * 4;
        
        summaryCard.style.transform = `translateY(-10px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        
        if (glare) {
            glare.style.setProperty('--x', `${x}px`);
            glare.style.setProperty('--y', `${y}px`);
        }
    });
    
    summaryCard.addEventListener('mouseleave', () => {
        summaryCard.style.transform = `translateY(0) rotateX(0) rotateY(0)`;
    });
}

// === HORIZONTAL PIN SCROLL ===
const scrollSection = document.querySelector('.horizontal-scroll-section');
const track = document.querySelector('.horizontal-track');

if (scrollSection && track) {
    window.addEventListener('scroll', () => {
        const sectionTop = scrollSection.offsetTop;
        const sectionHeight = scrollSection.offsetHeight;
        const windowHeight = window.innerHeight;
        
        // Calculate progress (0 to 1)
        const scrollDistance = window.scrollY - sectionTop;
        const scrollableDistance = sectionHeight - windowHeight;
        let progress = scrollDistance / scrollableDistance;
        progress = Math.max(0, Math.min(1, progress));
        
        // Calculate translation
        // Total width of all cards minus screen width, plus padding
        const maxTranslate = track.scrollWidth - window.innerWidth + 80;
        const translateX = progress * -maxTranslate;
        
        // Apply smooth translation
        track.style.transform = `translate3d(${translateX}px, 0, 0)`;
    }, { passive: true });
}

// === NAVBAR SCROLL EFFECT ===
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// === 3D TILT ON CONTACT BOXES ===
document.querySelectorAll('.contact-box').forEach((card) => {
    const glare = card.querySelector('.contact-box-glare');
    
    card.addEventListener('mousemove', (e) => {
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

// === 3D TILT ON OBJECTIVE CARD ===
const objectiveCard = document.getElementById('objectiveCard');
if (objectiveCard) {
    const glare = objectiveCard.querySelector('.objective-glare');
    
    objectiveCard.addEventListener('mousemove', (e) => {
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
