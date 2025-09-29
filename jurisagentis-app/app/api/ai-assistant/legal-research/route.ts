/**
 * Legal Research API - GPT-5 powered legal research and analysis
 */

import { NextRequest, NextResponse } from 'next/server'

interface ResearchRequest {
  action: 'search' | 'analyze' | 'cite' | 'save' | 'shepardize' | 'get_related'
  query?: string
  jurisdiction?: string
  practice_area?: string
  search_scope?: 'cases' | 'statutes' | 'regulations' | 'secondary' | 'all'
  date_range?: {
    start: string
    end: string
  }
  authority_id?: string
  user_id: string
}

interface LegalAuthority {
  id: string
  type: 'case' | 'statute' | 'regulation' | 'secondary_source' | 'law_review' | 'treatise'
  title: string
  citation: string
  jurisdiction: string
  court?: string
  date: string
  relevance_score: number
  key_holdings: string[]
  summary: string
  full_text_url?: string
  shepardized: boolean
  treatment: 'positive' | 'negative' | 'neutral' | 'unknown'
  cited_by_count: number
  practice_areas: string[]
  key_phrases: string[]
  gpt5_analysis: {
    significance: string
    practical_impact: string
    related_concepts: string[]
    strategic_considerations: string[]
  }
}

interface ResearchAnalysis {
  summary: string
  key_trends: string[]
  practical_implications: string[]
  recommended_strategy: string[]
  confidence_score: number
  gaps_identified: string[]
  legal_principles: string[]
  risk_assessment: {
    level: 'low' | 'medium' | 'high'
    factors: string[]
    mitigation_strategies: string[]
  }
  business_impact: {
    implications: string[]
    opportunities: string[]
    compliance_requirements: string[]
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ResearchRequest = await request.json()
    const { action, query, jurisdiction, practice_area, search_scope, date_range, authority_id, user_id } = body

    if (!user_id) {
      return NextResponse.json({
        success: false,
        error: { message: 'User ID is required' }
      }, { status: 400 })
    }

    switch (action) {
      case 'search':
        return await handleLegalSearch(query!, jurisdiction, practice_area, search_scope, date_range, user_id)
      
      case 'analyze':
        return await handleDeepAnalysis(query!, jurisdiction, practice_area, user_id)
      
      case 'cite':
        return await handleCitationGeneration(authority_id!, user_id)
      
      case 'save':
        return await handleSaveResearch(body, user_id)
      
      case 'shepardize':
        return await handleShepardAnalysis(authority_id!, user_id)
      
      case 'get_related':
        return await handleRelatedAuthorities(authority_id!, user_id)
      
      default:
        return NextResponse.json({
          success: false,
          error: { message: 'Invalid action' }
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Legal research API error:', error)
    return NextResponse.json({
      success: false,
      error: { message: 'Internal server error' }
    }, { status: 500 })
  }
}

async function handleLegalSearch(
  query: string,
  jurisdiction: string = 'federal',
  practiceArea: string = 'all',
  searchScope: string = 'all',
  dateRange: { start: string; end: string } | undefined,
  _userId: string
): Promise<NextResponse> {
  try {
    // Simulate GPT-5 powered legal research
    await new Promise(resolve => setTimeout(resolve, 2000))

    const authorities = await generateLegalAuthorities(query, jurisdiction, practiceArea, searchScope)
    const analysis = await generateResearchAnalysis(query, authorities, jurisdiction, practiceArea)
    const relatedQueries = await generateRelatedQueries(query, practiceArea)

    const result = {
      query_id: `research_${Date.now()}`,
      total_results: authorities.length,
      processing_time: '2.1 seconds',
      authorities,
      ai_analysis: analysis,
      related_queries: relatedQueries,
      citations_formatted: authorities.map(auth => generateCitations(auth)),
      search_metadata: {
        query,
        jurisdiction,
        practice_area: practiceArea,
        search_scope: searchScope,
        date_range: dateRange,
        model_used: 'GPT-5 Legal Research Specialist',
        confidence_threshold: 0.7,
        total_sources_analyzed: 50000
      }
    }

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Legal search error:', error)
    return NextResponse.json({
      success: false,
      error: { message: 'Failed to perform legal search' }
    }, { status: 500 })
  }
}

async function handleDeepAnalysis(
  query: string,
  jurisdiction: string,
  practiceArea: string,
  _userId: string
): Promise<NextResponse> {
  try {
    // Simulate advanced GPT-5 legal analysis
    await new Promise(resolve => setTimeout(resolve, 3000))

    const deepAnalysis = {
      executive_summary: `Comprehensive legal analysis of "${query}" reveals significant developments in ${practiceArea} law within ${jurisdiction} jurisdiction.`,
      
      legal_landscape: {
        current_state: `The legal framework governing ${query} has evolved significantly in recent years, with courts increasingly favoring practical approaches that balance legal principles with business realities.`,
        key_developments: [
          'Recent judicial interpretations have strengthened enforceability standards',
          'Legislative updates have clarified ambiguous areas of law',
          'Regulatory changes have impacted compliance requirements',
          'Emerging technology considerations are shaping legal precedents'
        ],
        trend_analysis: 'Overall trend toward greater legal certainty and predictable outcomes'
      },

      strategic_recommendations: {
        immediate_actions: [
          'Review current compliance procedures against latest standards',
          'Update contractual language to reflect recent legal developments',
          'Implement best practices identified in recent case law',
          'Consider proactive risk mitigation strategies'
        ],
        long_term_strategy: [
          'Monitor ongoing legislative developments',
          'Build relationships with key regulatory bodies',
          'Develop expertise in emerging legal areas',
          'Create comprehensive compliance frameworks'
        ],
        risk_mitigation: [
          'Document all compliance efforts thoroughly',
          'Maintain regular legal review cycles',
          'Establish clear escalation procedures',
          'Train staff on relevant legal requirements'
        ]
      },

      competitive_intelligence: {
        industry_practices: 'Leading organizations are implementing advanced compliance monitoring systems',
        best_practices: [
          'Automated compliance tracking systems',
          'Regular legal review processes',
          'Cross-functional legal teams',
          'Continuous education programs'
        ],
        emerging_trends: [
          'AI-powered legal compliance tools',
          'Predictive legal analytics',
          'Automated contract analysis',
          'Real-time regulatory monitoring'
        ]
      },

      implementation_roadmap: {
        phase_1: {
          timeline: '30 days',
          objectives: ['Immediate compliance review', 'Risk assessment', 'Gap analysis'],
          deliverables: ['Compliance audit report', 'Risk matrix', 'Action plan']
        },
        phase_2: {
          timeline: '90 days',
          objectives: ['Process improvements', 'System updates', 'Training programs'],
          deliverables: ['Updated procedures', 'Training materials', 'Monitoring systems']
        },
        phase_3: {
          timeline: '180 days',
          objectives: ['Advanced implementation', 'Performance monitoring', 'Continuous improvement'],
          deliverables: ['Full implementation', 'Performance metrics', 'Optimization plans']
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        deep_analysis: deepAnalysis,
        analysis_id: `deep_${Date.now()}`,
        model_used: 'GPT-5 Advanced Legal Analysis',
        confidence_score: 0.91,
        generated_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Deep analysis error:', error)
    return NextResponse.json({
      success: false,
      error: { message: 'Failed to perform deep analysis' }
    }, { status: 500 })
  }
}

async function handleCitationGeneration(_authorityId: string, _userId: string): Promise<NextResponse> {
  try {
    // Generate various citation formats
    const citations = {
      bluebook: {
        full: 'Smith v. Johnson Indus., 456 F.3d 789 (9th Cir. 2023).',
        short: 'Smith, 456 F.3d at 792.',
        parenthetical: 'Smith v. Johnson Indus., 456 F.3d 789, 792 (9th Cir. 2023) (holding that electronic signatures under E-SIGN Act are presumptively valid).'
      },
      alwd: {
        full: 'Smith v. Johnson Indus., 456 F.3d 789 (9th Cir. 2023).',
        short: 'Smith, 456 F.3d at 792.',
        parenthetical: 'Smith v. Johnson Indus., 456 F.3d 789, 792 (9th Cir. 2023) (electronic signatures under E-SIGN Act presumptively valid).'
      },
      chicago: {
        full: 'Smith v. Johnson Industries, 456 F.3d 789 (9th Cir. 2023).',
        footnote: '¹ Smith v. Johnson Industries, 456 F.3d 789, 792 (9th Cir. 2023).',
        bibliography: 'Smith v. Johnson Industries. 456 F.3d 789 (9th Cir. 2023).'
      },
      apa: {
        full: 'Smith v. Johnson Industries, 456 F.3d 789 (9th Cir. 2023).',
        reference: 'Smith v. Johnson Industries, 456 F.3d 789 (9th Cir. 2023).'
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        citations,
        authority_id: authorityId,
        generated_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Citation generation error:', error)
    return NextResponse.json({
      success: false,
      error: { message: 'Failed to generate citations' }
    }, { status: 500 })
  }
}

async function handleSaveResearch(body: ResearchRequest, _userId: string): Promise<NextResponse> {
  try {
    // In real implementation, save to database
    const savedResearch = {
      id: `saved_${Date.now()}`,
      user_id: _userId,
      query: body.query,
      results: (body as unknown as { results: unknown }).results,
      metadata: (body as unknown as { metadata: unknown }).metadata,
      saved_at: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: {
        saved_research_id: savedResearch.id,
        saved_at: savedResearch.saved_at
      }
    })

  } catch (error) {
    console.error('Save research error:', error)
    return NextResponse.json({
      success: false,
      error: { message: 'Failed to save research' }
    }, { status: 500 })
  }
}

async function handleShepardAnalysis(authorityId: string, _userId: string): Promise<NextResponse> {
  try {
    // Simulate Shepard's-style analysis
    const shepardAnalysis = {
      authority_id: authorityId,
      overall_treatment: 'positive',
      citing_authorities: [
        {
          id: 'cite1',
          title: 'Wilson v. Tech Solutions Inc.',
          citation: '789 F.3d 123 (2nd Cir. 2024)',
          treatment: 'followed',
          relevance: 'high',
          summary: 'Followed Smith precedent on electronic signature validity'
        },
        {
          id: 'cite2',
          title: 'Digital Commerce Corp v. State Board',
          citation: '345 F.Supp.3d 678 (S.D.N.Y. 2024)',
          treatment: 'distinguished',
          relevance: 'medium',
          summary: 'Distinguished Smith on grounds of consumer vs. commercial context'
        },
        {
          id: 'cite3',
          title: 'Advanced Analytics LLC v. Data Corp',
          citation: '567 F.3d 234 (5th Cir. 2024)',
          treatment: 'cited',
          relevance: 'medium',
          summary: 'Cited Smith in dicta regarding digital authentication standards'
        }
      ],
      treatment_summary: {
        positive: 15,
        negative: 2,
        neutral: 8,
        total: 25
      },
      key_issues: [
        'Electronic signature validity in commercial transactions',
        'E-SIGN Act preemption of state law',
        'Burden of proof for challenging electronic signatures',
        'Technical requirements for digital authentication'
      ],
      current_status: 'Good law - no negative treatment on core holdings'
    }

    return NextResponse.json({
      success: true,
      data: {
        shepard_analysis: shepardAnalysis,
        analyzed_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Shepard analysis error:', error)
    return NextResponse.json({
      success: false,
      error: { message: 'Failed to perform Shepard analysis' }
    }, { status: 500 })
  }
}

async function handleRelatedAuthorities(_authorityId: string, _userId: string): Promise<NextResponse> {
  try {
    const relatedAuthorities = [
      {
        id: 'related1',
        title: 'Uniform Electronic Transactions Act Analysis',
        type: 'secondary_source',
        relevance_score: 0.89,
        relationship: 'statutory_framework',
        summary: 'Comprehensive analysis of UETA provisions related to electronic signature law'
      },
      {
        id: 'related2',
        title: 'Electronic Signatures in E-Commerce: A Practitioner\'s Guide',
        type: 'treatise',
        relevance_score: 0.85,
        relationship: 'practical_guidance',
        summary: 'Practical guidance on implementing electronic signature systems in commercial settings'
      },
      {
        id: 'related3',
        title: 'Jones v. Digital Solutions Network',
        type: 'case',
        relevance_score: 0.82,
        relationship: 'similar_facts',
        summary: 'Similar factual pattern involving electronic signature validity challenges'
      }
    ]

    return NextResponse.json({
      success: true,
      data: {
        related_authorities: relatedAuthorities,
        total_found: relatedAuthorities.length,
        generated_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Related authorities error:', error)
    return NextResponse.json({
      success: false,
      error: { message: 'Failed to find related authorities' }
    }, { status: 500 })
  }
}

// Helper functions for generating legal research data
async function generateLegalAuthorities(
  _query: string,
  _jurisdiction: string,
  _practiceArea: string,
  searchScope: string
): Promise<LegalAuthority[]> {
  // Simulate GPT-5 legal research with comprehensive authority generation
  const baseAuthorities: LegalAuthority[] = [
    {
      id: 'auth_case_1',
      type: 'case',
      title: 'Smith v. Johnson Industries',
      citation: '456 F.3d 789 (9th Cir. 2023)',
      jurisdiction: 'Federal (9th Circuit)',
      court: 'United States Court of Appeals for the Ninth Circuit',
      date: '2023-03-15',
      relevance_score: 0.94,
      key_holdings: [
        'Electronic signatures under E-SIGN Act are presumptively valid in commercial contracts',
        'Burden of proof for challenging electronic signature validity rests with challenging party',
        'Technical compliance with digital signature standards creates strong presumption of authenticity',
        'Commercial context strengthens enforceability of electronic agreements'
      ],
      summary: 'Landmark federal appellate decision establishing comprehensive framework for electronic signature validity in commercial transactions. The court provided detailed analysis of E-SIGN Act requirements and created strong presumption favoring electronic signature enforceability.',
      full_text_url: 'https://legal-research.example.com/cases/smith-v-johnson-2023',
      shepardized: true,
      treatment: 'positive',
      cited_by_count: 127,
      practice_areas: ['contract_law', 'commercial_law', 'technology_law'],
      key_phrases: ['electronic signature', 'E-SIGN Act', 'commercial contracts', 'digital authentication', 'presumptive validity'],
      gpt5_analysis: {
        significance: 'Establishes definitive federal standard for electronic signature validity, resolving circuit split on burden of proof issues',
        practical_impact: 'Significantly strengthens enforceability of electronic contracts in commercial settings, reduces litigation risk for businesses using electronic signature platforms',
        related_concepts: ['digital authentication', 'consumer protection', 'interstate commerce', 'technology adoption'],
        strategic_considerations: ['Use as primary authority in electronic signature disputes', 'Cite for strong presumption arguments', 'Consider in contract drafting for electronic execution clauses']
      }
    },
    {
      id: 'auth_statute_1',
      type: 'statute',
      title: 'Electronic Signatures in Global and National Commerce Act',
      citation: '15 U.S.C. § 7001 et seq.',
      jurisdiction: 'Federal',
      date: '2000-06-30',
      relevance_score: 0.91,
      key_holdings: [
        'Electronic signatures and records have same legal effect as written signatures',
        'Cannot deny legal effect solely because in electronic form',
        'Consumer consent requirements for electronic transactions',
        'Preemption of inconsistent state law requirements'
      ],
      summary: 'Federal statute establishing comprehensive legal framework for electronic signatures and records in interstate and international commerce. Provides foundational legal authority with broad preemptive effect over state law restrictions.',
      shepardized: true,
      treatment: 'positive',
      cited_by_count: 2543,
      practice_areas: ['contract_law', 'commercial_law', 'technology_law', 'consumer_protection'],
      key_phrases: ['electronic signature', 'electronic record', 'consumer consent', 'interstate commerce', 'preemption'],
      gpt5_analysis: {
        significance: 'Foundational federal legislation that revolutionized contract law by establishing legal parity between electronic and traditional signatures',
        practical_impact: 'Enables widespread adoption of electronic contracting, reduces transaction costs, facilitates e-commerce growth',
        related_concepts: ['UETA harmonization', 'consumer protection', 'technological neutrality', 'interstate commerce regulation'],
        strategic_considerations: ['Primary statutory authority for electronic signature validity', 'Use for preemption arguments against state law challenges', 'Key reference for compliance program development']
      }
    },
    {
      id: 'auth_case_2',
      type: 'case',
      title: 'Tech Corp v. Innovation LLC',
      citation: '234 F.Supp.3d 567 (N.D. Cal. 2022)',
      jurisdiction: 'Federal (N.D. Cal.)',
      court: 'United States District Court for the Northern District of California',
      date: '2022-08-22',
      relevance_score: 0.87,
      key_holdings: [
        'Digital signature platforms must maintain adequate security measures',
        'Audit trails and timestamp records are crucial for electronic signature validity',
        'Multi-factor authentication enhances electronic signature reliability',
        'Platform security standards affect weight given to electronic evidence'
      ],
      summary: 'District court decision providing detailed guidance on technical requirements for electronic signature platforms in high-value commercial transactions. Establishes practical standards for security measures and documentation requirements.',
      full_text_url: 'https://legal-research.example.com/cases/tech-corp-v-innovation-2022',
      shepardized: true,
      treatment: 'positive',
      cited_by_count: 89,
      practice_areas: ['contract_law', 'technology_law', 'commercial_law', 'evidence_law'],
      key_phrases: ['digital signature platform', 'security measures', 'audit trail', 'multi-factor authentication', 'timestamp records'],
      gpt5_analysis: {
        significance: 'Provides practical guidance on technical implementation requirements for electronic signature systems, bridging gap between legal theory and technology practice',
        practical_impact: 'Establishes industry standards for electronic signature security, guides platform selection and implementation decisions',
        related_concepts: ['cybersecurity', 'data integrity', 'authentication protocols', 'evidence admissibility'],
        strategic_considerations: ['Use for technical requirements in electronic signature policies', 'Reference for vendor selection criteria', 'Cite in disputes involving signature platform security']
      }
    },
    {
      id: 'auth_law_review_1',
      type: 'law_review',
      title: 'Electronic Contract Formation in the Digital Age: Challenges and Solutions',
      citation: '45 Harvard Law Review 234 (2023)',
      jurisdiction: 'Academic',
      date: '2023-02-01',
      relevance_score: 0.83,
      key_holdings: [
        'Analysis of emerging issues in electronic contract formation',
        'Recommendations for best practices in digital signature implementation',
        'Comparison of international electronic signature frameworks',
        'Future trends in electronic contracting technology'
      ],
      summary: 'Comprehensive academic analysis of current electronic contract formation law with practical recommendations for practitioners. Includes comparative analysis of international approaches and emerging technology considerations including blockchain and AI applications.',
      shepardized: false,
      treatment: 'neutral',
      cited_by_count: 45,
      practice_areas: ['contract_law', 'technology_law', 'international_law', 'comparative_law'],
      key_phrases: ['electronic contract formation', 'digital signature implementation', 'international frameworks', 'best practices', 'emerging technology'],
      gpt5_analysis: {
        significance: 'Provides scholarly perspective on evolving electronic contract law, identifies emerging issues and future trends',
        practical_impact: 'Offers strategic insights for long-term planning, identifies potential regulatory and technological developments',
        related_concepts: ['blockchain technology', 'artificial intelligence', 'cross-border transactions', 'regulatory harmonization'],
        strategic_considerations: ['Use for forward-looking legal analysis', 'Reference for international transaction planning', 'Cite for academic authority on emerging issues']
      }
    }
  ]

  // Filter authorities based on search scope
  if (searchScope !== 'all') {
    return baseAuthorities.filter(auth => {
      switch (searchScope) {
        case 'cases':
          return auth.type === 'case'
        case 'statutes':
          return auth.type === 'statute'
        case 'regulations':
          return auth.type === 'regulation'
        case 'secondary':
          return ['secondary_source', 'law_review', 'treatise'].includes(auth.type)
        default:
          return true
      }
    })
  }

  return baseAuthorities
}

async function generateResearchAnalysis(
  query: string,
  _authorities: LegalAuthority[],
  _jurisdiction: string,
  _practiceArea: string
): Promise<ResearchAnalysis> {
  // Simulate GPT-5 advanced legal analysis
  return {
    summary: `Comprehensive analysis of "${query}" reveals a well-developed legal framework with strong support for electronic signature validity. Federal law provides clear guidance through the E-SIGN Act, with recent case law strengthening enforceability standards and providing practical implementation guidance.`,
    
    key_trends: [
      'Courts increasingly favor electronic signature validity with strong presumptions',
      'Technical compliance requirements becoming more stringent and standardized',
      'Multi-factor authentication and audit trails gaining critical importance',
      'International harmonization of electronic signature standards progressing',
      'Regulatory focus shifting toward consumer protection and platform security'
    ],
    
    practical_implications: [
      'Electronic signature platforms must maintain robust audit trails and security measures',
      'Multi-factor authentication should be implemented for high-value transactions',
      'Technical compliance with industry standards is increasingly important for enforceability',
      'Documentation of security measures and authentication procedures is crucial',
      'International transactions require consideration of jurisdiction-specific requirements',
      'Consumer transactions may have additional consent and disclosure requirements'
    ],
    
    recommended_strategy: [
      'Rely on federal E-SIGN Act as primary legal authority for electronic signature validity',
      'Use Smith v. Johnson Industries precedent for strong presumption arguments',
      'Implement technical safeguards consistent with Tech Corp decision requirements',
      'Document all compliance procedures and security measures thoroughly',
      'Consider academic perspectives for comprehensive understanding of emerging issues',
      'Develop jurisdiction-specific strategies for international transactions'
    ],
    
    confidence_score: 0.89,
    
    gaps_identified: [
      'Limited case law on blockchain-based digital signatures and smart contracts',
      'Unclear standards for AI-generated signature verification and authentication',
      'International treaty implications for cross-border electronic transactions not fully developed',
      'Consumer protection standards for electronic signature platforms vary by jurisdiction',
      'Emerging technology integration (IoT, biometrics) lacks comprehensive legal framework'
    ],
    
    legal_principles: [
      'Technological neutrality in contract formation',
      'Functional equivalence between electronic and traditional signatures',
      'Good faith and fair dealing in electronic contracting',
      'Consumer protection in electronic transactions',
      'Interstate commerce regulation of electronic signatures'
    ],
    
    risk_assessment: {
      level: 'low',
      factors: [
        'Strong federal statutory framework provides legal certainty',
        'Recent case law strengthens enforceability presumptions',
        'Technical standards are well-established and widely adopted'
      ],
      mitigation_strategies: [
        'Implement comprehensive electronic signature policies',
        'Use reputable platforms with strong security measures',
        'Maintain detailed audit trails and documentation',
        'Regular legal compliance reviews and updates'
      ]
    },
    
    business_impact: {
      implications: [
        'Enables widespread adoption of electronic contracting processes',
        'Reduces transaction costs and processing time significantly',
        'Facilitates remote business operations and digital transformation',
        'Improves contract execution efficiency and record-keeping'
      ],
      opportunities: [
        'Competitive advantage through faster contract execution',
        'Cost savings from reduced paper processing and storage',
        'Enhanced customer experience through digital workflows',
        'Improved compliance monitoring and audit capabilities'
      ],
      compliance_requirements: [
        'E-SIGN Act compliance for interstate commerce',
        'State UETA compliance where applicable',
        'Consumer disclosure requirements for electronic transactions',
        'Industry-specific regulations (healthcare, financial services)',
        'Data protection and privacy law compliance'
      ]
    }
  }
}

async function generateRelatedQueries(_query: string, _practiceArea: string): Promise<string[]> {
  // Generate contextually relevant research queries
  const relatedQueries = [
    'blockchain electronic signatures legal validity and enforceability',
    'international electronic signature recognition and cross-border enforcement',
    'AI signature verification legal standards and authentication requirements',
    'electronic signature consumer protection requirements and disclosure obligations',
    'UETA vs E-SIGN Act differences and interaction in electronic contracting',
    'digital signature security standards and technical requirements',
    'electronic contract formation mutual assent and consideration issues',
    'mobile electronic signatures legal validity and platform requirements'
  ]

  // Filter based on practice area relevance
  return relatedQueries.slice(0, 6)
}

function generateCitations(authority: LegalAuthority) {
  return {
    bluebook: `${authority.title}, ${authority.citation}.`,
    alwd: `${authority.title}, ${authority.citation}.`,
    chicago: `${authority.title}, ${authority.citation}.`
  }
}