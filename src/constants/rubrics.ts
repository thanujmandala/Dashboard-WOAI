import type { CriterionRubric, CompetitionSettings } from '../types';

export const REVIEW_1_RUBRICS: CriterionRubric[] = [
  {
    id: 'r1_c1',
    name: 'Problem Understanding & Clarity',
    description: 'Depth of domain comprehension, clarity of problem scope, and articulation of core challenges.',
    max_score: 10,
  },
  {
    id: 'r1_c2',
    name: 'Target User Identification',
    description: 'Definition of primary/secondary user personas, empathy mapping, and validation of user pain points.',
    max_score: 10,
  },
  {
    id: 'r1_c3',
    name: 'Ideology / Insight',
    description: 'Strategic perspective, novel algorithmic/AI framing, and core value proposition.',
    max_score: 10,
  },
  {
    id: 'r1_c4',
    name: 'Uniqueness & Feasibility',
    description: 'Competitive edge, technical viability, realistic execution timeline, and resource sanity.',
    max_score: 10,
  },
  {
    id: 'r1_c5',
    name: 'Technical Reasoning + Communication & Q/A',
    description: 'Defensibility of tech choices, confidence during Q&A, and articulate presentation.',
    max_score: 10,
  },
];

export const REVIEW_2_RUBRICS: CriterionRubric[] = [
  {
    id: 'r2_c1',
    name: 'Functional Prototype',
    description: 'Working live demo, execution of core pipeline, and working user flows with real/synthetic inputs.',
    max_score: 10,
  },
  {
    id: 'r2_c2',
    name: 'Technical Architecture',
    description: 'System design quality, model selection, modularity, API structure, and data pipelines.',
    max_score: 10,
  },
  {
    id: 'r2_c3',
    name: 'Constraint Compliance',
    description: 'Adherence to hardware/compute budgets, latency limits, offline capability, or environment constraints.',
    max_score: 10,
  },
  {
    id: 'r2_c4',
    name: 'Innovation & UX',
    description: 'User interface responsiveness, human-AI interaction intuitiveness, and creative workflows.',
    max_score: 10,
  },
  {
    id: 'r2_c5',
    name: 'Performance + Security & Privacy',
    description: 'Inference speed, token efficiency, data sanitization, privacy guardrails, and vulnerability mitigation.',
    max_score: 10,
  },
];

export const REVIEW_3_RUBRICS: CriterionRubric[] = [
  {
    id: 'r3_c1',
    name: 'Real-World Impact',
    description: 'Tangible societal/industrial transformation, measurable benefits, and field deployment viability.',
    max_score: 20,
  },
  {
    id: 'r3_c2',
    name: 'Technical Depth',
    description: 'Advanced AI/ML complexity, fine-tuning/RAG/agents maturity, and engineering rigor.',
    max_score: 20,
  },
  {
    id: 'r3_c3',
    name: 'Innovation / Differentiation',
    description: 'Breakthrough IP, distinct moat versus state-of-the-art baselines, and patentable/novel approach.',
    max_score: 20,
  },
  {
    id: 'r3_c4',
    name: 'Scalability + Robustness Under Failure',
    description: 'Stress tolerance, edge case handling, fallback mechanisms, and multi-tenant distributed capability.',
    max_score: 20,
  },
  {
    id: 'r3_c5',
    name: 'Business Feasibility + Crisis Response',
    description: 'Unit economics, go-to-market plan, crisis recovery resilience, and compliance readiness.',
    max_score: 20,
  },
];

export const DEFAULT_SETTINGS: CompetitionSettings = {
  competition_name: 'Wonders of AI',
  subtitle: 'National AI Hackathon & Grand Championship',
  review_1_name: 'Review 1 – Prelims',
  review_1_max: 50,
  review_1_weight: 25,
  review_2_name: 'Review 2 – Mains',
  review_2_max: 50,
  review_2_weight: 25,
  review_3_name: 'Review 3 – Grand Finale',
  review_3_max: 100,
  review_3_weight: 50,
  advancement_threshold_percent: 90, // Top teams with combined R1+R2 >= 90%
  advancement_top_teams_limit: 50,
};

export const REVIEW_RUBRIC_MAP: Record<number, CriterionRubric[]> = {
  1: REVIEW_1_RUBRICS,
  2: REVIEW_2_RUBRICS,
  3: REVIEW_3_RUBRICS,
};
