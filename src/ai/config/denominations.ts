export interface DenominationalTradition {
  id: string;
  name: string;
  description: string;
  key_theological_emphases: string[];
  common_interpretive_lens: string[];
}

export const DENOMINATIONAL_TRADITIONS: DenominationalTradition[] = [
  {
    id: 'reformed',
    name: 'Reformed',
    description: 'Emphasizes God\'s sovereignty, covenant theology, and salvation by grace through faith.',
    key_theological_emphases: ['Sovereignty of God', 'Covenant Theology', 'TULIP'],
    common_interpretive_lens: ['Systematic Theology', 'Historical-Grammatical'],
  },
  {
    id: 'catholic',
    name: 'Catholic',
    description: 'Emphasizes tradition, sacraments, and the authority of the Magisterium.',
    key_theological_emphases: ['Sacramental Theology', 'Tradition', 'Papal Authority'],
    common_interpretive_lens: ['Patristic Writings', 'Church Councils'],
  },
  {
    id: 'orthodox',
    name: 'Orthodox',
    description: 'Emphasizes theosis, the Holy Trinity, and the role of icons.',
    key_theological_emphases: ['Theosis', 'Trinity', 'Icons', 'Apostolic Succession'],
    common_interpretive_lens: ['Early Church Fathers', 'Liturgical Context'],
  },
  {
    id: 'pentecostal',
    name: 'Pentecostal',
    description: 'Emphasizes the experience of the Holy Spirit, spiritual gifts, and divine healing.',
    key_theological_emphases: ['Holy Spirit Baptism', 'Spiritual Gifts', 'Divine Healing'],
    common_interpretive_lens: ['Experiential', 'Literal Interpretation'],
  },
  {
    id: 'lutheran',
    name: 'Lutheran',
    description: 'Emphasizes justification by faith alone, the authority of Scripture, and the two kingdoms doctrine.',
    key_theological_emphases: ['Sola Fide', 'Sola Scriptura', 'Two Kingdoms'],
    common_interpretive_lens: ['Confessional Documents', 'Historical-Grammatical'],
  },
  // Add more traditions as needed
];