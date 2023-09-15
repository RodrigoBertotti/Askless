import {ProductEntity} from "../../domain/entity/product-entity";


export class ProductModel extends ProductEntity {

    output() {
        return {
            "id": this.id,
            "price": this.price,
            "name": this.name,
        }
    }

    static fromEntity(entity: ProductEntity) {
        return Object.assign(new ProductModel(entity.id, entity.name, entity.price), entity);
    }

    static fromEntityList(entityList: ProductEntity[]) {
        return entityList.map(entity => ProductModel.fromEntity(entity));
    }

    static fromInput(input) : ProductModel {
        return new ProductModel(input["id"], input["name"], input["price"]);
    }
}
