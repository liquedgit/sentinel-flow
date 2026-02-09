import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Sentinel Flow',
      link: null,
      collapsed: false,
      items: ['project-overview', 'purpose'],
    },
    'agent',
    'detection-engine',
    'tools',
  ],
};

export default sidebars;
