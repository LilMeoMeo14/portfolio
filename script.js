document.addEventListener('DOMContentLoaded', () => {

    // Smooth scrolling for nav links
    document.querySelectorAll('nav a').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const target = document.querySelector(targetId);
            target.scrollIntoView({ behavior: 'smooth' });
            
            // Update active class
            document.querySelectorAll('nav a').forEach(link => link.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Header scroll effect
    window.addEventListener('scroll', () => {
        const header = document.querySelector('header');
        header.classList.toggle('scrolled', window.scrollY > 50);
    });

    // Animate elements on scroll
    const animatedElements = document.querySelectorAll('[data-animate]');
    const animateObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add(entry.target.dataset.animate);
                animateObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    animatedElements.forEach(el => animateObserver.observe(el));

    // Animate progress bars on scroll
    const progressBars = document.querySelectorAll('.progress');
    const skillsSection = document.querySelector('#my-skill');

    if (skillsSection) {
        const animateProgress = () => {
            progressBars.forEach(bar => {
                const width = bar.dataset.width;
                bar.style.width = width;
            });
        };

        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                animateProgress();
                observer.unobserve(skillsSection);
            }
        }, { threshold: 0.5 });

        observer.observe(skillsSection);
    }


    // === CODE BONG BÓNG VẬT LÝ MỚI ===
    const stage = document.getElementById('stage');
    if (stage) {
        let W = stage.clientWidth, H = stage.clientHeight;

        // Tự động lấy 3 bubble core (không phụ thuộc id)
        const coreEls = stage.querySelectorAll('.bubble.core');
        if (coreEls.length < 3) {
            console.warn("⚠️ Cần ít nhất 3 .bubble.core trong #stage để chạy hiệu ứng.");
            return;
        }
        const [coreA, coreB, coreC] = coreEls;

        function layoutCores() {
            W = stage.clientWidth;
            H = stage.clientHeight;
            const size = coreA.offsetWidth;
            const gap = 20;
            const total = size * 3 + gap * 2;
            const startX = (W - total) / 2;
            const baseY = (H - size) / 2;
            const offsetY = 40;

            coreA.style.transform = `translate(${startX}px, ${baseY + offsetY}px)`;
            coreB.style.transform = `translate(${startX + size + gap}px, ${baseY - offsetY}px)`;
            coreC.style.transform = `translate(${startX + (size + gap) * 2}px, ${baseY + offsetY}px)`;
        }
        window.addEventListener('resize', layoutCores);
        layoutCores();

        // === Bubble nhỏ ===
        const movers = [...stage.querySelectorAll('.bubble.small')].map(el => {
            const size = 50 + Math.random() * 20;
            el.style.width = el.style.height = `${size}px`;
            return {
                el,
                size,
                x: Math.random() * (W - size),
                y: Math.random() * (H - size),
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                mass: size * size * 0.002,
                bobPhase: Math.random() * Math.PI * 2
            };
        });

        function rect(el) {
            const s = el.getBoundingClientRect(), r = stage.getBoundingClientRect();
            // Chú ý: getBoundingClientRect() đã bao gồm transform
            // Chúng ta cần vị trí *sau khi* transform
            // Cách đơn giản nhất là lấy từ transform-computed-style, nhưng phức tạp
            // Tạm dùng BoundingRect, nhưng nó sẽ hơi lệch khi resize
            // Giải pháp tốt hơn là lưu vị trí của core sau khi layoutCores()
            const transform = window.getComputedStyle(el).transform;
            if (transform && transform !== 'none') {
                 const matrix = new DOMMatrixReadOnly(transform);
                 return { cx: matrix.m41 + s.width / 2, cy: matrix.m42 + s.height / 2, r: s.width / 2 };
            }
            // Fallback nếu transform chưa sẵn sàng
            return { cx: s.left - r.left + s.width / 2, cy: s.top - r.top + s.height / 2, r: s.width / 2 };
        }
        
        let coreCache = [];
        function updateCoreObstacles() {
             coreCache = [coreA, coreB, coreC].map(rect);
             return coreCache;
        }
        updateCoreObstacles();
        window.addEventListener('resize', updateCoreObstacles); // Cập nhật vị trí core khi resize


        const mouse = { x: -9999, y: -9999, active: false };
        stage.addEventListener('mousemove', e => {
            const r = stage.getBoundingClientRect();
            mouse.x = e.clientX - r.left;
            mouse.y = e.clientY - r.top;
            mouse.active = true;
        });
        stage.addEventListener('mouseleave', () => (mouse.active = false));

        const friction = 0.992,
            wallBounce = 0.9,
            repelRadius = 120,
            repelStrength = 2.2;

        // === Xử lý va chạm giữa các bubble nhỏ ===
        function resolveMoverMover() {
            for (let i = 0; i < movers.length; i++) {
                for (let j = i + 1; j < movers.length; j++) {
                    const a = movers[i];
                    const b = movers[j];
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const dist = Math.hypot(dx, dy);
                    const minDist = (a.size + b.size) / 2;

                    if (dist < minDist && dist > 0.001) {
                        const nx = dx / dist;
                        const ny = dy / dist;
                        const overlap = minDist - dist;
                        const totalMass = a.mass + b.mass;

                        // đẩy nhẹ ra 2 phía
                        a.x -= nx * overlap * (b.mass / totalMass);
                        a.y -= ny * overlap * (b.mass / totalMass);
                        b.x += nx * overlap * (a.mass / totalMass);
                        b.y += ny * overlap * (a.mass / totalMass);

                        // phản xạ vận tốc (như vật lý)
                        const rvx = b.vx - a.vx;
                        const rvy = b.vy - a.vy;
                        const vn = rvx * nx + rvy * ny;
                        if (vn < 0) {
                            const e = 0.8;
                            const j = -(1 + e) * vn / (1 / a.mass + 1 / b.mass);
                            const ix = j * nx, iy = j * ny;
                            a.vx -= ix / a.mass;
                            a.vy -= iy / a.mass;
                            b.vx += ix / b.mass;
                            b.vy += iy / b.mass;
                        }
                    }
                }
            }
        }

        function resolveWalls(m) {
            if (m.x < 0) { m.x = 0; m.vx = Math.abs(m.vx) * wallBounce; }
            if (m.y < 0) { m.y = 0; m.vy = Math.abs(m.vy) * wallBounce; }
            if (m.x + m.size > W) { m.x = W - m.size; m.vx = -Math.abs(m.vx) * wallBounce; }
            if (m.y + m.size > H) { m.y = H - m.size; m.vy = -Math.abs(m.vy) * wallBounce; }
        }

        function step() {
            // Chỉ cập nhật coreCache nếu kích thước cửa sổ thay đổi
            if (W !== stage.clientWidth || H !== stage.clientHeight) {
                W = stage.clientWidth;
                H = stage.clientHeight;
                layoutCores(); // Sắp xếp lại vị trí core
                updateCoreObstacles(); // Lấy vị trí mới
            }

            resolveMoverMover(); // ✅ tránh chồng lên nhau

            for (const m of movers) {
                // Đẩy khỏi các core
                for (const c of coreCache) {
                    const mx = m.x + m.size / 2, my = m.y + m.size / 2;
                    const dx = mx - c.cx, dy = my - c.cy;
                    const dist = Math.hypot(dx, dy);
                    const repelRange = c.r + 90;
                    if (dist < repelRange && dist > 1) {
                        const f = (1 - dist / repelRange) * 0.08;
                        const nx = dx / dist, ny = dy / dist;
                        m.vx += nx * f;
                        m.vy += ny * f;
                    }
                }

                // Đẩy chuột
                if (mouse.active) {
                    const dx = m.x + m.size / 2 - mouse.x;
                    const dy = m.y + m.size / 2 - mouse.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < repelRadius * repelRadius) {
                        const d = Math.sqrt(d2) || 1;
                        const f = (1 - d / repelRadius) * repelStrength;
                        m.vx += (dx / d) * f;
                        m.vy += (dy / d) * f;
                    }
                }

                // Cập nhật vị trí
                m.x += m.vx;
                m.y += m.vy;
                m.vx *= friction;
                m.vy *= friction;
                resolveWalls(m);

                // Hiệu ứng bồng bềnh
                const t = performance.now() / 1000;
                const bobY = Math.sin(t * 2.5 + m.bobPhase) * 10;
                const bobX = Math.cos(t * 2 + m.bobPhase) * 6;
                m.el.style.transform = `translate(${m.x + bobX}px, ${m.y + bobY}px)`;
            }

            requestAnimationFrame(step);
        }

        movers.forEach(m => m.el.style.transform = `translate(${m.x}px,${m.y}px)`);
        step();
    }



    // Contact form submission (simulation)
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Send succesfully');
            contactForm.reset();
        });
    }

    // Button actions in home
    const btnViewProject = document.querySelector('.btn-view-project');
    if (btnViewProject) {
        btnViewProject.addEventListener('click', () => {
            document.querySelector('#my-project').scrollIntoView({ behavior: 'smooth' });
        });
    }

    const btnContactForWork = document.querySelector('.btn-contact-for-work');
    if (btnContactForWork) {
        btnContactForWork.addEventListener('click', () => {
            document.querySelector('#contact-me').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Timeline animation on scroll
    const timelineItems = document.querySelectorAll('.timeline-item');
    const timelineSection = document.querySelector('#timeline');

    if (timelineSection && timelineItems.length > 0) {
        const animateTimeline = () => {
            timelineItems.forEach((item, index) => {
                setTimeout(() => {
                    item.style.opacity = 1;
                    item.style.transform = 'translateX(0)';
                }, index * 200);
            });
        };

        const timelineObserver = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                animateTimeline();
                timelineObserver.unobserve(timelineSection);
            }
        }, { threshold: 0.3 });

        timelineItems.forEach(item => {
            item.style.opacity = 0;
            item.style.transition = 'all 0.5s ease';
            if (item.classList.contains('left')) {
                item.style.transform = 'translateX(-20px)';
            } else {
                item.style.transform = 'translateX(20px)';
            }
        });

        timelineObserver.observe(timelineSection);
    }

});