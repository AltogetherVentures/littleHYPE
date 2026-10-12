export interface Product {
  id: string;
  name: string;
  price: string;
  tagline: string;
  description: string;
  features: string[];
  imageUrl: string;
  videoUrl?: string; // Optional for prototype
  type: 'digital' | 'physical';
  themeColor: 'primary' | 'teal' | 'coral' | 'purple' | 'pink' | 'charcoal';
}

export interface Benefit {
  title: string;
  description: string;
  iconName: 'zap' | 'battery' | 'smile' | 'heart' | 'cloud' | 'ghost' | 'box' | 'sparkles' | 'lock' | 'palette' | 'sun' | 'star' | 'mic' | 'gift';
  color: 'primary' | 'teal' | 'coral' | 'purple' | 'pink';
}

export interface HowItWorksStep {
  title: string;
  description: string;
  color: 'primary' | 'teal' | 'coral' | 'purple' | 'pink';
}

export interface ProductVibe {
    audiences: { text: string; iconName: string }[];
    idCard: {
        title: string;
        tag: string;
        vibe: string;
        status: string;
        purity: string;
    }
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface ProductPageContent {
    benefits: Benefit[];
    howItWorks: {
        heading: string;
        subheading: string;
        steps: HowItWorksStep[];
        videoUrl?: string; // Specific demo video
    };
    vibeCheck: ProductVibe;
    guarantee: string;
    faqs: FaqItem[];
}

export interface Testimonial {
  id: string;
  name: string;
  handle: string;
  text: string;
  avatarUrl: string;
}