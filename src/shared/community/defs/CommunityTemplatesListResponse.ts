/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * SFDX command output when listing available community templates
 */
import { CommunityTemplates } from './CommunityTemplates';

export type CommunityTemplatesListResponse = {
  /**
   * list of templates
   */
  templates: CommunityTemplates[];
  total: number;
};
