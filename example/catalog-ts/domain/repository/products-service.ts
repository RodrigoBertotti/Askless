import {ProductEntity} from "../entity/product-entity";

export type ProductsServiceParams = {
    /** Reference to: this.listProductsRoute.notifyChanges() */
    notifyChangesProductsChanged: () => void
};

export class ProductsService {
    private id = 1;
    private productsList:ProductEntity[] = []; //Example

    constructor(private readonly params:ProductsServiceParams) {
        let aux = 1;
        setInterval(() => {
            const product = new ProductEntity(null, 'Server Generated Product '+(aux++), 100);
            this.save(product);
        },  20*1000);
    }

    async save(product:ProductEntity):Promise<ProductEntity>{
        console.log("Saving "+product.name);
        product.id = this.id++;
        this.productsList.push(product);
        await this._notify();
        return Object.assign({}, product) as ProductEntity;
    }

    async readList(search?:string):Promise<ProductEntity[]>{
        console.log("Reading "+search);
        if(search == null || search.length == 0)
            return Array.from(this.productsList);
        search = search.toLowerCase();
        return Array.from(this.productsList.filter((p) => p.name.toLowerCase().includes(search!) || p.price.toString().includes(search!)));
    }

    async delete(id:number) : Promise<ProductEntity>{
        console.log("Removing "+id);
        const product = this.productsList.find((product) => product.id == id);
        this.productsList.splice(this.productsList.indexOf(product!),1);
        await this._notify();
        return Object.assign({}, product) as ProductEntity;
    }

    private async _notify(){
        console.log("Notifying clients that server has "+this.productsList.length+" products");
        this.params.notifyChangesProductsChanged();
    }
}

