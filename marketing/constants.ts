
import { Product, Testimonial, FaqItem, ProductPageContent } from './types';

export const PRODUCTS: Product[] = [
  {
    id: 'moments',
    name: 'Moments',
    price: '$15.00',
    tagline: 'Turn your friends into legends.',
    description: 'Transform your favorite people into the main character. Pick a genre, upload a photo, and let our AI turn your inside jokes into a 3-act cinematic masterpiece.',
    features: ['Cinematic Narration', '3-Panel Storyboard', 'Custom Art Styles', 'Shareable Link'],
    imageUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=2525&auto=format&fit=crop',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-projector-playing-a-movie-in-a-cinema-39870-large.mp4',
    type: 'digital',
    themeColor: 'teal'
  },
  {
    id: 'space-log',
    name: 'Space_log',
    price: '$4.99',
    tagline: 'Submit your daily dispatch.',
    description: 'A retro-futuristic logging tool for reporting your emotional anomalies. Stop reflecting, start reporting.',
    features: ['Encrypted Entry', 'Anomaly Detection', 'Mission Protocols', 'Dark Mode Only'],
    imageUrl: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=2670&auto=format&fit=crop',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-a-holographic-interface-94-large.mp4',
    type: 'digital',
    themeColor: 'charcoal'
  },
  {
    id: 'hype-calendar',
    name: 'The Daily Hype Calendar',
    price: '$24.00',
    tagline: '365 days of aggressive positivity.',
    description: 'Start every morning with a punch of joy in the face. This desk calendar features 365 unique, hand-drawn illustrations and slightly unhinged compliments to get you through the grind.',
    features: ['Recycled paper', 'Tear-off pages', 'Includes 12 stickers', 'Guaranteed smiles'],
    imageUrl: 'https://picsum.photos/id/1080/600/600',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-ink-swirling-in-water-196-large.mp4',
    type: 'physical',
    themeColor: 'primary'
  },
  {
    id: 'digital-hug',
    name: 'Digital Hug Pack',
    price: '$5.00',
    tagline: 'Send a hug instantly.',
    description: 'A collection of high-res, heartwarming animations and soundscapes you can send to friends who are having a rough day. It’s like a hug, but over WiFi.',
    features: ['5 animated GIFs', '3 ambient soundscapes', 'Instant download', 'infinite usage'],
    imageUrl: 'https://picsum.photos/id/1060/600/600',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-liquid-abstract-background-of-purple-color-2285-large.mp4',
    type: 'digital',
    themeColor: 'purple'
  },
  {
    id: 'void-screaming',
    name: 'Scream Into The Void App',
    price: 'Free',
    tagline: 'Let it all out. We won\'t tell.',
    description: 'Sometimes you just need to scream. Our app visualizes your stress as abstract art that vanishes after 10 seconds. Therapeutic, private, and weirdly beautiful.',
    features: ['Energy reacting visuals', 'Privacy focused', 'Dark mode only', 'Zero tracking'],
    imageUrl: 'https://picsum.photos/id/1015/600/600',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-video-of-a-colorful-liquid-2287-large.mp4',
    type: 'digital',
    themeColor: 'charcoal'
  },
  {
    id: 'mystery-box',
    name: 'Mystery Box of Joy',
    price: '$45.00',
    tagline: 'What\'s inside? Pure serotonin.',
    description: 'We curate a box of 3-5 physical items from independent artists that fit the "littleHYPE" vibe. Toys, stationery, snacks, or wearable art. No two boxes are exactly alike.',
    features: ['Curated selection', 'Supports indie artists', 'Fun unboxing experience', 'Reusable box'],
    imageUrl: 'https://picsum.photos/id/1025/600/600',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-red-and-blue-ink-in-water-1193-large.mp4',
    type: 'physical',
    themeColor: 'coral'
  }
];

export const PRODUCT_CONTENTS: Record<string, ProductPageContent> = {
    'moments': {
        benefits: [
            { title: "Main Character Energy", description: "Finally, the cinematic recognition they deserve.", iconName: "star", color: "purple" },
            { title: "Narrated Gold", description: "Professional voiceover styles that sell the drama.", iconName: "mic", color: "teal" },
            { title: "Instant Gift", description: "No shipping times. Create, render, and send in minutes.", iconName: "gift", color: "pink" }
        ],
        howItWorks: {
            heading: "From Anecdote to Art",
            subheading: "The Director's Cut of your friendship.",
            steps: [
                { title: "Pick the Vibe", description: "Select a genre. Noir? RomCom? Wes Anderson-ish?", color: "teal" },
                { title: "Tell the Tale", description: "Securely type that one time they did that thing.", color: "purple" },
                { title: "Premiere", description: "We generate the visuals and narration. You take the credit.", color: "pink" }
            ],
            videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-projector-playing-a-movie-in-a-cinema-39870-large.mp4"
        },
        vibeCheck: {
            audiences: [
                { text: "Best Friends", iconName: "heart" },
                { text: "Movie Buffs", iconName: "film" },
                { text: "Storytellers", iconName: "mic" },
                { text: "Sentimental Types", iconName: "sparkles" }
            ],
            idCard: { title: "DIRECTOR", tag: "VISIONARY", vibe: "Cinematic", status: "Filming", purity: "4K" }
        },
        guarantee: "If they don't cry or laugh until they cry, we'll rewrite the script.",
        faqs: [
            { id: '1', question: "How long does it take?", answer: "About 5 minutes to create, 2 minutes to render." },
            { id: '2', question: "Can I use embarrassing photos?", answer: "We encourage it. It builds character." },
            { id: '3', question: "Is it a real video file?", answer: "Yes! You get a shareable link and a download option." }
        ]
    },
    'space-log': {
        benefits: [
            { title: "Report", description: "Log your data.", iconName: "lock", color: "primary" },
            { title: "Analyze", description: "Find anomalies.", iconName: "zap", color: "teal" },
            { title: "Correct", description: "Fix the timeline.", iconName: "sparkles", color: "coral" }
        ],
        howItWorks: {
            heading: "Protocol",
            subheading: "Follow procedures.",
            steps: [],
            videoUrl: ""
        },
        vibeCheck: {
            audiences: [],
            idCard: { title: "AGENT", tag: "CLASSIFIED", vibe: "Unknown", status: "Active", purity: "0%" }
        },
        guarantee: "Data integrity guaranteed.",
        faqs: []
    },
    'hype-calendar': {
        benefits: [
            { title: "Morning Jolt", description: "Wakes you up faster than espresso. Or at least makes you hate the alarm clock slightly less.", iconName: "sun", color: "primary" },
            { title: "Analog Touch", description: "Remember paper? It feels nice. Tearing off a page is the ultimate 'done with yesterday' power move.", iconName: "palette", color: "teal" },
            { title: "Daily Laugh", description: "365 jokes, compliments, and weird facts. Guaranteed to be at least 42% funnier than your boss.", iconName: "smile", color: "coral" }
        ],
        howItWorks: {
            heading: "Your Daily Ritual",
            subheading: "It's not rocket science, it's paper science.",
            steps: [
                { title: "Wake Up (Sorry)", description: "The hardest part. We can't help you here.", color: "primary" },
                { title: "Rip It Good", description: "Tear off yesterday's page. Crumple it. Throw it. Feel the power.", color: "teal" },
                { title: "Absorb Joy", description: "Read today's hype. Let it marinate in your soul.", color: "coral" }
            ],
            videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-white-calendar-pages-flipping-quickly-42774-large.mp4"
        },
        vibeCheck: {
            audiences: [
                { text: "People who struggle with 'Mornings'", iconName: "cloud" },
                { text: "Stationery addicts", iconName: "palette" },
                { text: "Anyone needing a daily win", iconName: "crown" },
                { text: "You, probably", iconName: "user" }
            ],
            idCard: { title: "CERTIFIED", tag: "OPTIMIST", vibe: "Radiant", status: "Caffeinated", purity: "100%" }
        },
        guarantee: "If this calendar doesn't make you smile at least once a week, send it back and we'll send you a sad trombone sound effect.",
        faqs: [
            { id: '1', question: "What happens in a leap year?", answer: "You get one extra day of hype for free. We are generous like that." },
            { id: '2', question: "Is it refillable?", answer: "No, it's a tear-off. Destruction is part of the healing process." },
            { id: '3', question: "Are the jokes actually funny?", answer: "Our mom thinks so. But she also laughs at salad, so..." }
        ]
    },
    'digital-hug': {
        benefits: [
            { title: "Teleport Affection", description: "Physics says you can't be in two places at once. We say: hold my beer.", iconName: "heart", color: "pink" },
            { title: "Awkwardness Free", description: "Skip the awkward physical contact. Pure emotional support, zero sweat.", iconName: "ghost", color: "purple" },
            { title: "Instant Battery", description: "Recharges your friend's social battery faster than a lightning cable.", iconName: "battery", color: "teal" }
        ],
        howItWorks: {
            heading: "Emotional Wifi",
            subheading: "Connecting hearts without buffering.",
            steps: [
                { title: "Choose Vibe", description: "Select from 'Gentle Squeeze', 'Bear Hug', or 'Chaos Embrace'.", color: "pink" },
                { title: "Send Link", description: "Text it. DM it. AirDrop it to strangers (maybe not that).", color: "purple" },
                { title: "Dopamine Hit", description: "They open it, visuals play, sounds soothe. Friendship leveled up.", color: "teal" }
            ],
            videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-abstract-animation-of-purple-shapes-moving-2286-large.mp4"
        },
        vibeCheck: {
            audiences: [
                { text: "Long-distance besties", iconName: "heart" },
                { text: "Introverts who care", iconName: "ghost" },
                { text: "People bad with words", iconName: "smile" },
                { text: "Modern lovers", iconName: "zap" }
            ],
            idCard: { title: "CERTIFIED", tag: "BESTIE", vibe: "Wholesome", status: "Connected", purity: "99.9%" }
        },
        guarantee: "If they don't feel at least 15% more loved, we will personally email them a picture of a puppy.",
        faqs: [
            { id: '1', question: "How do I send this?", answer: "You get a unique link. Text it, email it, or print it out and throw it at them (please don't throw it)." },
            { id: '2', question: "Does it expire?", answer: "Digital love is eternal. The link works forever." },
            { id: '3', question: "Can I buy it for myself?", answer: "Absolutely. Self-love is the best love. Treat yourself." }
        ]
    },
    'void-screaming': {
        benefits: [
            { title: "Cheaper Than Therapy", description: "We are not doctors, but screaming into a pillow is scientifically proven to help.* (*Not proven).", iconName: "smile", color: "primary" },
            { title: "Zero Data Stored", description: "Your dispatches vanish into the digital ether. No logs, no tracking, just release.", iconName: "lock", color: "coral" },
            { title: "Angst to Art", description: "Watch your frustration turn into beautiful, swirling abstract colors.", iconName: "palette", color: "purple" }
        ],
        howItWorks: {
            heading: "Primal Release 2.0",
            subheading: "Like yoga, but louder.",
            steps: [
                { title: "Open The Void", description: "Find a quiet place (or a loud one, we don't judge).", color: "primary" },
                { title: "Let It Out", description: "Vent. Whisper your secrets. The visuals react to your typing.", color: "coral" },
                { title: "Watch It Fade", description: "See your noise dissolve into nothingness. Feel lighter.", color: "purple" }
            ],
            videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-colorful-liquid-paint-swirling-in-abstract-shapes-42686-large.mp4"
        },
        vibeCheck: {
            audiences: [
                { text: "Burnt out corporates", iconName: "battery" },
                { text: "Neighbors with thin walls", iconName: "lock" },
                { text: "Mercury in Retrograde survivors", iconName: "sparkles" },
                { text: "Everyone in 2024", iconName: "user" }
            ],
            idCard: { title: "CERTIFIED", tag: "CHAOTIC", vibe: "Spicy", status: "Venting", purity: "100%" }
        },
        guarantee: "If you don't feel lighter after 3 releases, you can vent to our customer support (please don't).",
        faqs: [
            { id: '1', question: "Does anyone see the dispatch?", answer: "Just the NSA agent assigned to your phone. (Kidding! It is processed locally)." },
            { id: '2', question: "Can I release happy things?", answer: "Sure, but the void prefers angst. It tastes better." },
            { id: '3', question: "Is this actual therapy?", answer: "Legally? No. Spiritually? We think so." }
        ]
    },
    'mystery-box': {
        benefits: [
            { title: "Decision Fatigue Cure", description: "Stop choosing. Let the universe (and us) decide your fate.", iconName: "box", color: "primary" },
            { title: "Support Artists", description: "Everything inside comes from cool indie creators who actually do a happy dance when you buy.", iconName: "heart", color: "pink" },
            { title: "Curated Chaos", description: "It might be a mug. It might be a weird hat. It will definitely be awesome.", iconName: "sparkles", color: "teal" }
        ],
        howItWorks: {
            heading: "The Great Unknown",
            subheading: "Life is a box of chocolates, etc etc.",
            steps: [
                { title: "Take The Leap", description: "Click buy. Feel the thrill of uncertainty.", color: "primary" },
                { title: "The Long Wait", description: "Stare out the window for the mail carrier. This is part of the fun.", color: "pink" },
                { title: "Unboxing Glory", description: "Open it. Film it. Pretend you're an influencer. Enjoy the loot.", color: "teal" }
            ],
            videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-gift-box-opening-animation-4366-large.mp4"
        },
        vibeCheck: {
            audiences: [
                { text: "Risk takers", iconName: "zap" },
                { text: "People who love mail", iconName: "box" },
                { text: "Indie art lovers", iconName: "palette" },
                { text: "Impulse buyers", iconName: "smile" }
            ],
            idCard: { title: "CERTIFIED", tag: "LEGEND", vibe: "Mysterious", status: "Waiting", purity: "???" }
        },
        guarantee: "If you absolutely hate everything inside, you probably hate fun. But we'll still refund you.",
        faqs: [
            { id: '1', question: "Can I request specific items?", answer: "That would defeat the 'Mystery' part, wouldn't it? Trust the chaos." },
            { id: '2', question: "What if I get a duplicate?", answer: "You won't. Every box is hand-packed by a caffeinated human." },
            { id: '3', question: "Is it safe for kids?", answer: "Mostly. Maybe don't let them eat the packing peanuts (even if they are biodegradable)." }
        ]
    }
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah J.',
    handle: '@sarah_smiles',
    text: 'I bought the calendar as a joke but now I genuinely can’t start my day without it. It’s unhinged in the best way.',
    avatarUrl: 'https://picsum.photos/id/64/100/100'
  },
  {
    id: '2',
    name: 'Mike T.',
    handle: '@mike_makes_stuff',
    text: 'The digital hug pack saved my long-distance relationship. Okay, maybe that’s an exaggeration, but it helped!',
    avatarUrl: 'https://picsum.photos/id/91/100/100'
  },
  {
    id: '3',
    name: 'Elara V.',
    handle: '@elara_v',
    text: 'Finally, a brand that understands that I want to be happy but I also want to be a little bit weird about it.',
    avatarUrl: 'https://picsum.photos/id/177/100/100'
  }
];

export const FAQS: FaqItem[] = [
  {
    id: '1',
    question: 'Is this a real company?',
    answer: 'Yes! We are real humans who like fun things. We are based in a small studio filled with plants and coffee cups.'
  },
  {
    id: '2',
    question: 'How long does shipping take?',
    answer: 'We ship within 2 business days. Domestic orders usually arrive in 3-5 days. International orders... well, it’s an adventure, but usually 2 weeks.'
  },
  {
    id: '3',
    question: 'Can I return the digital items?',
    answer: 'Digital items are non-refundable because you can’t really "return" a file, but if you’re unhappy, email us and we’ll make it right.'
  },
  {
    id: '4',
    question: 'Are the mystery boxes actually good?',
    answer: 'We think so! We only put stuff in there that we would actually buy ourselves. No filler, no junk.'
  },
  {
    id: '5',
    question: 'Do you work with creators?',
    answer: 'Always! If you make weird, happy art, slide into our DMs or email us.'
  }
];

export const TIKTOK_VIDEOS = [
    {
        id: '1',
        title: 'Packing orders at 3AM 😴📦',
        views: '12.4K',
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-person-wrapping-a-gift-box-with-brown-paper-40662-large.mp4',
        coverUrl: 'https://picsum.photos/id/1/400/700'
    },
    {
        id: '2',
        title: 'Why I quit my corporate job ✌️',
        views: '45.2K',
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-man-working-on-his-laptop-at-home-43098-large.mp4',
        coverUrl: 'https://picsum.photos/id/2/400/700'
    },
    {
        id: '3',
        title: 'New sticker drop! ✨',
        views: '8.1K',
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-putting-stickers-on-a-laptop-42867-large.mp4',
        coverUrl: 'https://picsum.photos/id/3/400/700'
    },
    {
        id: '4',
        title: 'My ADHD brain vs. Excel sheets 🤯',
        views: '102K',
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-man-working-on-laptop-with-an-overwhelmed-expression-41221-large.mp4',
        coverUrl: 'https://picsum.photos/id/4/400/700'
    },
    {
        id: '5',
        title: 'Studio tour! (It is messy)',
        views: '15K',
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-graphic-designer-working-on-a-tablet-41005-large.mp4',
        coverUrl: 'https://picsum.photos/id/5/400/700'
    },
    {
        id: '6',
        title: 'Answering your weirdest DMs',
        views: '22K',
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-girl-looking-at-her-phone-and-smiling-41045-large.mp4',
        coverUrl: 'https://picsum.photos/id/6/400/700'
    }
];
