// NOTE: Despite using TypeScript, we hand-write the types for this core module.

import Live from './Live';
import Computation from './Computation';
import Value from './Value';

(Live as any).Computation = Computation;
(Live as any).Value = Value;

export default Live;
