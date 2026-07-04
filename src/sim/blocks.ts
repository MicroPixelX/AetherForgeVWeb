export enum BlockId {
  Air = 0,
  Grass = 1,
  Dirt = 2,
  Stone = 3,
  Sand = 4,
  Water = 5,
  Wood = 6,
  Leaves = 7,
  Bedrock = 8,
  Planks = 9,
  Cobblestone = 10,
  Glass = 11,
  Count,
}

export interface BlockProperties {
  id: BlockId;
  name: string;
  solid: boolean;
  transparent: boolean;
  opaqueCube: boolean;
}

const TABLE: Readonly<Record<BlockId, BlockProperties>> = {
  [BlockId.Air]:         { id: BlockId.Air,         name: "air",        solid: false, transparent: true,  opaqueCube: false },
  [BlockId.Grass]:       { id: BlockId.Grass,       name: "grass",      solid: true,  transparent: false, opaqueCube: true  },
  [BlockId.Dirt]:        { id: BlockId.Dirt,        name: "dirt",       solid: true,  transparent: false, opaqueCube: true  },
  [BlockId.Stone]:       { id: BlockId.Stone,       name: "stone",      solid: true,  transparent: false, opaqueCube: true  },
  [BlockId.Sand]:        { id: BlockId.Sand,        name: "sand",       solid: true,  transparent: false, opaqueCube: true  },
  [BlockId.Water]:       { id: BlockId.Water,       name: "water",      solid: false, transparent: true,  opaqueCube: false },
  [BlockId.Wood]:        { id: BlockId.Wood,        name: "wood",       solid: true,  transparent: false, opaqueCube: true  },
  [BlockId.Leaves]:      { id: BlockId.Leaves,      name: "leaves",     solid: true,  transparent: true,  opaqueCube: false },
  [BlockId.Bedrock]:     { id: BlockId.Bedrock,     name: "bedrock",    solid: true,  transparent: false, opaqueCube: true  },
  [BlockId.Planks]:      { id: BlockId.Planks,      name: "planks",     solid: true,  transparent: false, opaqueCube: true  },
  [BlockId.Cobblestone]: { id: BlockId.Cobblestone, name: "cobblestone",solid: true,  transparent: false, opaqueCube: true  },
  [BlockId.Glass]:       { id: BlockId.Glass,       name: "glass",      solid: true,  transparent: true,  opaqueCube: false },
  [BlockId.Count]:       { id: BlockId.Air,         name: "invalid",    solid: false, transparent: true,  opaqueCube: false },
};

export function blockProperties(id: BlockId): BlockProperties {
  return TABLE[id] ?? TABLE[BlockId.Air];
}

export const isAir = (id: BlockId): boolean => id === BlockId.Air;
export const isRenderable = (id: BlockId): boolean => id !== BlockId.Air;
