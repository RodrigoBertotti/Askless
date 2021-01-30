import { CreateRoute } from "./CreateRoute";
import { ReadRoute } from "./ReadRoute";
import { UpdateRoute } from "./UpdateRoute";
import { DeleteRoute } from "./DeleteRoute";

export type Route =
  | CreateRoute
  | ReadRoute
  | UpdateRoute
  | DeleteRoute;
