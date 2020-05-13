// NOTE: Despite using TypeScript, we hand-write the types for this core module.

import Live from './Live';
import Value from './Value';
import Computation from './Computation';
import Subscription from './Subscription';

(Live as any).Value = Value;
(Live as any).Computation = Computation;
(Live as any).Subscription = Subscription;

export default Live;
