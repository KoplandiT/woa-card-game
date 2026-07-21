import germanHqImage from '../assets/hq/german/german-hq.png';
import sovietHqImage from '../assets/hq/soviet/soviet-hq.jpg';
import usaHqImage from '../assets/hq/usa/usa-hq.jpg';
import type { FactionId, HqNation } from '../types';

export type HqDefinition = {
  nation: HqNation;
  nationName: string;
  name: string;
  attack: number;
  hp: number;
  resource: number;
  image: string;
  faction: FactionId;
};

// A valaszthato nemzetek es HQ statjaik kozos adatforrasa a UI es a jateklogika szamara.
export const hqDefinitions: Record<HqNation, HqDefinition> = {
  germany: {
    nation: 'germany',
    nationName: 'German',
    name: 'Iron Command HQ',
    attack: 2,
    hp: 16,
    resource: 5,
    image: germanHqImage,
    faction: 'iron_vanguard',
  },
  soviet: {
    nation: 'soviet',
    nationName: 'Soviet',
    name: 'Red Dune Corps HQ',
    attack: 1,
    hp: 20,
    resource: 5,
    image: sovietHqImage,
    faction: 'red_dune_corps',
  },
  usa: {
    nation: 'usa',
    nationName: 'American',
    name: 'Skyforge Logistics HQ',
    attack: 1,
    hp: 18,
    resource: 6,
    image: usaHqImage,
    faction: 'skyforge_alliance',
  },
};

export const hqNationOrder: HqNation[] = ['germany', 'soviet', 'usa'];
