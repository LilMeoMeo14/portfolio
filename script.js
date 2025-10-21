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



// Dữ liệu đa ngôn ngữ
// Dữ liệu đa ngôn ngữ
const translations = {
    en: {
        // Navigation
        nav_home: "HOME",
        nav_about: "ABOUT ME",
        nav_timeline: "TIMELINE",
        nav_skill: "MY SKILL",
        nav_project: "MY PROJECTS",
        nav_contact: "CONTACT ME",
        
        // Home Section
        home_greeting: "Hey there! I'm Quang Trung — most people know me as Tommy.",
        home_title: "Website Developer",
        home_intro: "My passion lies at the intersection of technology and user experience. I focus on building intuitive websites that don't just work well—they feel good to use. I am a naturally curious learner, always seeking new ways to optimize performance and make the web a more enjoyable place for everyone.",
        home_slogan_title: "My slogan",
        home_slogan_text: "Sometimes, you gotta say \"Fuck it\", just do it",
        home_location: "Thu Duc, HCM, VIET NAM",
        btn_view_project: "View My projects",
        btn_contact: "Contact for work",
        btn_download_cv: "Download CV",
        social_follow: "Follow to know more about me:",
        
        // About Me Section
        about_title: "ABOUT ME",
        about_info_title: "Information:",
        about_name_label: "Name:",
        about_name_value: "Lương Đức Quang Trung",
        about_dob_label: "Date of Birth:",
        about_dob_value: "14/12/2005",
        about_education_label: "Education:",
        about_education_value: "University of Transport Ho Chi Minh City - UTH",
        about_gpa_label: "GPA:",
        about_gpa_value: "3.5/4.0",
        about_hobbies_title: "Hobbies:",
        hobby_1: "Programming & Discovering New Technologies",
        hobby_2: "Solving competitive programming algorithm problems",
        hobby_3: "Market research & business development",
        hobby_4: "Football",
        about_story_title: "Story of my life",
        about_story_text: "I got into computers quite early — around the age of six — when a friend invited me to play internet games. From that moment, I thought to myself: \"Wow, computers are amazing!\" That was when my passion for exploring technology first began to grow. However, my family wasn't well-off back then. It wasn't until sixth grade that I finally owned my first computer — an old machine with just 2GB of RAM, running Linux because it was too weak to handle Windows. Thanks to that underpowered computer, I learned how to optimize everything — games, applications, and even the system itself — just to make things run smoothly. Those experiences inspired a dream in me:",
        about_story_quote: "\"When I grow up, I'll study computer science and create highly optimized applications, so that people like my younger self won't have to struggle just to run a simple program.\"",
        about_story_end: "That's how my journey with technology began — a journey built on curiosity, passion, and overcoming limitations.",
        
        // Timeline Section
        timeline_title: "LIFE TIMELINE",
        timeline_1_year: "2011 - Started Primary School (Grade 1)",
        timeline_1_desc: "When I started first grade, I was introduced to the world of computers and the internet for the first time, mostly through playing games with my friends.",
        timeline_2_year: "2017 - Sixth Grade Milestone",
        timeline_2_desc: "Received my first computer, an old Linux machine. Learned system optimization and sparked deeper interest in technology.",
        timeline_3_year: "2020 - Entered High School",
        timeline_3_desc: "Started high school and began self-learning programming basics, focusing on C++ and problem-solving.",
        timeline_4_year: "2023 - Graduated High School & Entered University",
        timeline_4_desc: "Graduated high school and enrolled in University of Transport Ho Chi Minh City (UTH) majoring in Information Technology.",
        timeline_5_year: "Present - University Life",
        timeline_5_desc: "Currently pursuing IT degree at UTH with GPA 3.5/4.0, building projects in web development.",
        
        // Skills Section
        skills_title: "MY SKILLS",
        skills_frontend: "Frontend",
        skills_programming: "Programming Language",
        skills_framework: "Framework",
        skills_database: "Database",
        skills_other_title: "Other Tools & Technologies",
        
        // Projects Section
        projects_title: "MY PROJECTS",
        project_1_title: "Real Estate System Website",
        project_1_desc: "A comprehensive online platform for managing real estate properties, enabling users to list, search, buy, sell, and rent properties with advanced administrative features for streamlined operations.",
        project_2_title: "Metasploit Demo: Windows Exploitation via Malicious File",
        project_2_desc: "A hands-on cybersecurity demonstration showcasing vulnerability exploitation on Windows systems using Metasploit Framework through carefully crafted malicious files.",
        project_3_title: "Real-Time Video Chat and Meeting App (WebRTC)",
        project_3_desc: "A robust web application enabling seamless peer-to-peer video and audio communication, complete with text chat, multi-participant support, and dynamic room management using WebRTC technology.",
        project_4_title: "Intelligent Traffic Accident Detection System using YOLOv8",
        project_4_desc: "An advanced AI system that analyzes live video feeds from surveillance cameras to detect traffic accidents in real-time, utilizing object detection and activity recognition for immediate response.",
        project_5_title: "TreFund — Decentralized Fundraising Platform for Startups",
        project_5_desc: "A blockchain-powered crowdfunding solution that enables startups to raise funds securely through smart contracts, providing transparent contributions and milestone-based releases for investors.",
        project_6_title: "Carbon Credit Marketplace for EV Owners",
        project_6_desc: "A blockchain-based platform allowing electric vehicle owners to earn, trade, and sell carbon credits based on sustainable driving habits, promoting eco-friendly transportation.",
        
        // Contact Section
        contact_title: "CONTACT ME",
        contact_subtitle: "Get in Touch",
        contact_desc: "I'm always open to new opportunities and collaborations. Feel free to reach out!",
        form_name: "Your Name",
        form_email: "Your Email",
        form_message: "Your Message",
        form_submit: "Send Message",
        
        // Footer
        footer_text: "© 2025 Quang Trung (Tommy). All rights reserved."
    },
    
    vi: {
        // Navigation
        nav_home: "TRANG CHỦ",
        nav_about: "VỀ TÔI",
        nav_timeline: "DÒNG THỜI GIAN",
        nav_skill: "KỸ NĂNG",
        nav_project: "DỰ ÁN",
        nav_contact: "LIÊN HỆ",
        
        // Home Section
        home_greeting: "Chào bạn! Tôi là Quang Trung — mọi người thường gọi tôi với nickname là Tommy.",
        home_title: "Lập Trình Viên Website",
        home_intro: "Đam mê của tôi nằm ở giao điểm giữa công nghệ và trải nghiệm người dùng. Tôi tập trung vào việc xây dựng các trang web trực quan không chỉ hoạt động tốt mà còn mang lại cảm giác tuyệt vời khi sử dụng. Tôi là một người học hỏi tò mò, luôn tìm kiếm những cách mới để tối ưu hóa hiệu suất và làm cho web trở thành một nơi thú vị hơn cho mọi người.",
        home_slogan_title: "Phương châm sống của tôi",
        home_slogan_text: "Đôi lúc, cuộc đời phải khiến bạn phải nói \"TRỜI ƠI\", nhưng thôi kệ cứ làm việc hiện tại tốt nhất thôi",
        home_location: "Thủ Đức, HCM, VIỆT NAM",
        btn_view_project: "Xem dự án của tôi",
        btn_contact: "Liên hệ công việc",
        btn_download_cv: "Tải CV",
        social_follow: "Theo dõi để biết thêm về tôi:",
        
        // About Me Section
        about_title: "Sơ lược về tôi",
        about_info_title: "Thông tin:",
        about_name_label: "Họ tên:",
        about_name_value: "Lương Đức Quang Trung",
        about_dob_label: "Ngày sinh:",
        about_dob_value: "14/12/2005",
        about_education_label: "Học vấn:",
        about_education_value: "Đại học Giao thông Vận tải TP.HCM - UTH",
        about_gpa_label: "Điểm GPA:",
        about_gpa_value: "3.5/4.0",
        about_hobbies_title: "Sở thích:",
        hobby_1: "Lập trình & Khám phá Công nghệ Mới",
        hobby_2: "Giải quyết các bài toán thuật toán lập trình thi đấu",
        hobby_3: "Nghiên cứu thị trường & phát triển kinh doanh",
        hobby_4: "Bóng đá",
        about_story_title: "Câu chuyện cuộc đời tôi",
        about_story_text: "Tôi tiếp xúc với máy tính khá sớm — khoảng sáu tuổi — khi một người bạn rủ tôi chơi game internet. Từ thời điểm đó, tôi tự nghĩ: \"Wow, máy tính thật tuyệt vời!\" Đó là khi niềm đam mê khám phá công nghệ của tôi bắt đầu nảy nở. Tuy nhiên, gia đình tôi lúc đó không khá giả lắm. Mãi đến lớp 6 tôi mới có chiếc máy tính đầu tiên — một chiếc máy cũ với chỉ 2GB RAM, chạy Linux vì nó quá yếu để chạy Windows. Nhờ chiếc máy tính yếu ớt đó, tôi đã học cách tối ưu hóa mọi thứ — game, ứng dụng và thậm chí cả hệ thống — chỉ để mọi thứ chạy mượt mà. Những trải nghiệm đó đã truyền cảm hứng cho một ước mơ trong tôi:",
        about_story_quote: "\"Khi lớn lên, tôi sẽ học công nghệ thông tin và tạo ra các ứng dụng được tối ưu hóa cao, để những người như tôi lúc nhỏ không phải vật lộn chỉ để chạy một chương trình đơn giản.\"" ,
        about_story_end: " Đó là cách hành trình công nghệ của tôi bắt đầu — một hành trình được xây dựng trên sự tò mò, đam mê và vượt qua những giới hạn.",
        
        // Timeline Section
        timeline_title: "CÁC CỘT MỐC TRONG CUỘC ĐỜI TÔI",
        timeline_1_year: "2011 - Bắt đầu Tiểu học (Lớp 1)",
        timeline_1_desc: "Khi bắt đầu lớp 1, tôi biết đến internet và máy tính nhờ bạn bè rủ đi chơi game. ",
        timeline_2_year: "2017 - Sở hữu chiếc máy tính đầu tiên",
        timeline_2_desc: "Nhận được chiếc máy tính đầu tiên, một chiếc máy Lenovo cũ chạy hệ điều hành Linux với bản distro Mint. Bắt đầu đam mê với việc tìm hiểu và tối ưu hoá các ứng dụng.",
        timeline_3_year: "2020 - Vào Trung học Phổ thông",
        timeline_3_desc: "Bắt đầu học trung học làm quen kết bạn và bắt đầu tự học lập trình cơ bản, tập trung vào C++ và giải quyết vấn đề.",
        timeline_4_year: "2023 - Tốt nghiệp THPT & Vào Đại học",
        timeline_4_desc: "Tốt nghiệp trung học và thi đậu trường học Đại học Giao thông Vận tải TP.HCM (UTH) chuyên ngành Công nghệ Thông tin.",
        timeline_5_year: "Hiện tại - Đời sống Đại học",
        timeline_5_desc: "Hiện đang theo học ngành CNTT tại UTH với GPA 3.5/4.0, xây dựng các dự án phát triển web.",
        
        // Skills Section
        skills_title: "KỸ NĂNG CỦA TÔI",
        skills_frontend: "Frontend",
        skills_programming: "Ngôn ngữ Lập trình",
        skills_framework: "Framework",
        skills_database: "Cơ sở dữ liệu",
        skills_other_title: "Công cụ & Công nghệ khác",
        
        // Projects Section
        projects_title: "DỰ ÁN CỦA TÔI",
        project_1_title: "Website Hệ thống Bất động sản",
        project_1_desc: "Một nền tảng trực tuyến toàn diện để quản lý bất động sản, cho phép người dùng đăng tin, tìm kiếm, mua, bán và cho thuê bất động sản với các tính năng quản trị nâng cao để vận hành hợp lý.",
        project_2_title: "Demo Metasploit: Khai thác Windows qua File Độc hại",
        project_2_desc: "Một bản demo an ninh mạng thực hành trình diễn khai thác lỗ hổng trên hệ thống Windows sử dụng Metasploit Framework thông qua các file độc hại được tạo cẩn thận.",
        project_3_title: "Ứng dụng Chat Video & Họp thời gian thực (WebRTC)",
        project_3_desc: "Một ứng dụng web mạnh mẽ cho phép giao tiếp video và âm thanh ngang hàng liền mạch, hoàn chỉnh với chat văn bản, hỗ trợ nhiều người tham gia và quản lý phòng động bằng công nghệ WebRTC.",
        project_4_title: "Hệ thống Phát hiện Tai nạn Giao thông Thông minh sử dụng YOLOv8",
        project_4_desc: "Một hệ thống AI tiên tiến phân tích nguồn video trực tiếp từ camera giám sát để phát hiện tai nạn giao thông theo thời gian thực, sử dụng phát hiện đối tượng và nhận dạng hoạt động để phản ứng ngay lập tức.",
        project_5_title: "TreFund — Nền tảng Gây quỹ Phi tập trung cho Startup",
        project_5_desc: "Một giải pháp gây quỹ cộng đồng dựa trên blockchain cho phép các startup huy động vốn an toàn thông qua hợp đồng thông minh, cung cấp đóng góp minh bạch và giải ngân theo cột mốc cho nhà đầu tư.",
        project_6_title: "Sàn Giao dịch Tín chỉ Carbon cho Chủ xe Điện",
        project_6_desc: "Một nền tảng dựa trên blockchain cho phép chủ xe điện kiếm, giao dịch và bán tín chỉ carbon dựa trên thói quen lái xe bền vững, thúc đẩy giao thông thân thiện với môi trường.",
        
        // Contact Section
        contact_title: "LIÊN HỆ VỚI TÔI",
        contact_subtitle: "Kết nối",
        contact_desc: "Tôi luôn sẵn sàng cho những cơ hội và hợp tác mới. Hãy thoải mái liên hệ!",
        form_name: "Tên của bạn",
        form_email: "Email của bạn",
        form_message: "Tin nhắn của bạn",
        form_submit: "Gửi tin nhắn",
        
        // Footer
        footer_text: "© 2025 Quang Trung (Tommy). Tất cả quyền được bảo lưu."
    }
};

// Lưu ngôn ngữ hiện tại
let currentLang = localStorage.getItem('language') || 'en';

// Hàm chuyển đổi ngôn ngữ
function switchLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('language', lang);
    updateContent();
}

// Hàm cập nhật nội dung
function updateContent() {
    const t = translations[currentLang];
    
    // Update Navigation
    document.querySelectorAll('nav a').forEach((link, index) => {
        const keys = ['nav_home', 'nav_about', 'nav_timeline', 'nav_skill', 'nav_project', 'nav_contact'];
        if (keys[index]) {
            const icon = link.querySelector('i');
            link.innerHTML = '';
            link.appendChild(icon.cloneNode(true));
            link.innerHTML += ' ' + t[keys[index]];
        }
    });
    
    // Update Home Section
    document.querySelector('.information-card h1').textContent = t.home_greeting;
    document.querySelector('.information-card h2.typing-effect').textContent = t.home_title;
    document.querySelector('.information-card > p').textContent = t.home_intro;
    
    // Lấy h2 không có class typing-effect (đó là "My slogan")
    const allH2 = document.querySelectorAll('.information-card h2');
    allH2.forEach((h2) => {
        if (!h2.classList.contains('typing-effect')) {
            h2.textContent = t.home_slogan_title;
        }
    });
    
    document.querySelector('.slogan span').textContent = t.home_slogan_text;
    
    const contactInfo = document.querySelectorAll('.information-card .contact-info span');
    contactInfo[0].innerHTML = `<i class='bx bxs-map'></i> ${t.home_location}`;
    
    document.querySelector('.btn-view-project').textContent = t.btn_view_project;
    document.querySelector('.btn-contact-for-work').textContent = t.btn_contact;
    document.querySelector('.btn-download-cv').textContent = t.btn_download_cv;
    document.querySelector('.social-links span').textContent = t.social_follow;
    
    // Update About Me Section
    document.querySelector('#about-me h2').textContent = t.about_title;
    document.querySelector('.about-left h3:nth-of-type(1)').textContent = t.about_info_title;
    
    const infoItems = document.querySelectorAll('.info-item .info-text');
    infoItems[0].innerHTML = `<b>${t.about_name_label}</b> ${t.about_name_value}`;
    infoItems[1].innerHTML = `<b>${t.about_dob_label}</b> ${t.about_dob_value}`;
    infoItems[2].innerHTML = `<b>${t.about_education_label}</b> ${t.about_education_value}`;
    infoItems[3].innerHTML = `<b>${t.about_gpa_label}</b> ${t.about_gpa_value}`;
    
    document.querySelector('.about-left h3:nth-of-type(2)').textContent = t.about_hobbies_title;
    
    const hobbies = document.querySelectorAll('.hobby-box span');
    hobbies[0].textContent = t.hobby_1;
    hobbies[1].textContent = t.hobby_2;
    hobbies[2].textContent = t.hobby_3;
    hobbies[3].textContent = t.hobby_4;
    
    document.querySelector('.about-left h3:nth-of-type(3)').textContent = t.about_story_title;
    
    const storyText = document.querySelector('.my-story-text');
    storyText.innerHTML = `${t.about_story_text}<strong><em>${t.about_story_quote}</em></strong>${t.about_story_end}`;
    
    // Update Timeline Section
    document.querySelector('#timeline h2').textContent = t.timeline_title;
    
    const timelineItems = document.querySelectorAll('.timeline-item .timeline-text');
    const timelineKeys = [
        ['timeline_1_year', 'timeline_1_desc'],
        ['timeline_2_year', 'timeline_2_desc'],
        ['timeline_3_year', 'timeline_3_desc'],
        ['timeline_4_year', 'timeline_4_desc'],
        ['timeline_5_year', 'timeline_5_desc']
    ];
    
    timelineItems.forEach((item, index) => {
        item.querySelector('h4').textContent = t[timelineKeys[index][0]];
        item.querySelector('p').textContent = t[timelineKeys[index][1]];
    });
    
    // Update Skills Section
    document.querySelector('#my-skill h2').textContent = t.skills_title;
    
    const skillCategories = document.querySelectorAll('.skill-category h3');
    skillCategories[0].innerHTML = `<i class="bx bx-code-block"></i> ${t.skills_frontend}`;
    skillCategories[1].innerHTML = `<i class="bx bx-server"></i> ${t.skills_programming}`;
    skillCategories[2].innerHTML = `<i class="bx bx-server"></i> ${t.skills_framework}`;
    skillCategories[3].innerHTML = `<i class="bx bx-data"></i> ${t.skills_database}`;
    
    document.querySelector('.other-title').textContent = t.skills_other_title;
    
    // Update Projects Section
    document.querySelector('#my-project h2').textContent = t.projects_title;
    
    const projects = document.querySelectorAll('.project-card .project-info');
    const projectKeys = [
        ['project_1_title', 'project_1_desc'],
        ['project_2_title', 'project_2_desc'],
        ['project_3_title', 'project_3_desc'],
        ['project_4_title', 'project_4_desc'],
        ['project_5_title', 'project_5_desc'],
        ['project_6_title', 'project_6_desc']
    ];
    
    projects.forEach((project, index) => {
        project.querySelector('h3').textContent = t[projectKeys[index][0]];
        project.querySelector('p').textContent = t[projectKeys[index][1]];
    });
    
    // Update Contact Section
    document.querySelector('#contact-me h2').textContent = t.contact_title;
    document.querySelector('.contact-left h3').textContent = t.contact_subtitle;
    document.querySelector('.contact-left > p').textContent = t.contact_desc;
    
    document.querySelector('#contact-form input[type="text"]').placeholder = t.form_name;
    document.querySelector('#contact-form input[type="email"]').placeholder = t.form_email;
    document.querySelector('#contact-form textarea').placeholder = t.form_message;
    document.querySelector('#contact-form button').textContent = t.form_submit;
    
    // Update Footer
    document.querySelector('footer p').textContent = t.footer_text;
}

// Khởi tạo khi trang load
document.addEventListener('DOMContentLoaded', function() {
    updateContent();
});

// Export functions để sử dụng từ HTML
window.switchLanguage = switchLanguage;