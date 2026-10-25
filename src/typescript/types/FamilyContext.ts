import type { FamilyDayData } from './FamilyDayData';
import type { FamilyMember } from './FamilyMember';
import type { FamilyMeta } from './FamilyMeta';
import type { FamilyView } from './FamilyView';

/**
 * Defines the FamilyContext type: what the game knows about the family it is playing with.
 */

/**
 * What the game knows about the family it is playing with, kept up to date from Firebase.
 */
export type FamilyContext = {
    /** The family's id */
    fid: string;
    /** Its name and settings (null until they arrive) */
    meta: FamilyMeta | null;
    /** Its members, by uid */
    members: Record<string, FamilyMember>;
    /** Whether the NYT import is turned on for it */
    nytEnabled: boolean;
    /** Today's play (null until it arrives) */
    data: FamilyDayData | null;
    /** Which of today's words the player sees (saved on the device) */
    view: FamilyView;
};
