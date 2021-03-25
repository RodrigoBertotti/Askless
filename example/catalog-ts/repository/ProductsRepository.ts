import {Product} from "../models/Product";
import {listAllProductsRoute} from "../routes/ProductsRoute";


class ProductsRepository {
    private id = 1;
    private productsListFromDatabase:Product[] = []; //Example

    constructor() {
        let aux = 1;
        setInterval(() => {
            const product = new Product();
            product.name = 'Server Generated Product '+(aux++);
            product.price = 100;
            // noinspection JSIgnoredPromiseFromCall
            this.save(product);
        //},  1000);
        },  10*1000);
    }

    async save(product:Product):Promise<Product>{
        console.log("Saving "+product.name);
        product.id = this.id++;
        this.productsListFromDatabase.push(product);
        await this._notify();
        return product;
    }

    async readList(search?:string):Promise<Product[]>{
        console.log("Reading "+search);
        if(search == null || search.length == 0)
            return this.productsListFromDatabase;
        search = search.toLowerCase();
        return this.productsListFromDatabase.filter((p) => p.name.toLowerCase().includes(search) || p.price.toString().includes(search));
    }

    async delete(id:number) : Promise<Product>{
        console.log("Removing "+id);
        const product = this.productsListFromDatabase.find((product) => product.id == id);
        this.productsListFromDatabase.splice(this.productsListFromDatabase.indexOf(product),1);
        await this._notify();
        return product;
    }

    private async _notify(){
        console.log("Notifying clients that server has "+this.productsListFromDatabase.length+" products");
        listAllProductsRoute.notifyClients({
            output: this.productsListFromDatabase,
        });
    }

    // async list(where?:Map<keyof ProductsRepository, any>):Promise<ProductDartEntity[]>{
    //     if(!where)
    //         return this.productsListFromDatabase;
    //     const res:ProductDartEntity[] = [];
    //     for(let i=0;i<this.productsListFromDatabase.length;i++){
    //         const productFromDatabase = res[i];
    //         let filterOk = true;
    //         where.forEach((value, key) => {
    //             if(productFromDatabase[key] != value){
    //                 filterOk = false;
    //             }
    //         });
    //         if(filterOk){
    //             res.push(productFromDatabase);
    //         }
    //     }
    //     return res;
    // }

}


export const productsRepository = new ProductsRepository();
