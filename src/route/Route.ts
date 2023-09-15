import { CreateRoute } from "./CreateRoute";
import { ReadRoute } from "./ReadRoute";
import { UpdateRoute } from "./UpdateRoute";
import { DeleteRoute } from "./DeleteRoute";

export type Route<ENTITY> =
  | CreateRoute<ENTITY, any, any>
  | ReadRoute<ENTITY, any, any>
  | UpdateRoute<ENTITY, any, any>
  | DeleteRoute<ENTITY, any, any>;
