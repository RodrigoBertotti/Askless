const route = require("../routes/ProductsRoute");class ProductsRepository {
    id = 1;
    productsListFromDatabase = []; //Example

    constructor() {
        let aux = 1;
        setInterval(() => {
            const product = {};
            product['name'] = 'Server Generated Product '+(aux++);
            product['price'] = 100;
            // noinspection JSIgnoredPromiseFromCall
            this.save(product);
        //},  1000);
        },  10*1000);
    }

    async save(product){
        console.log("Saving "+product.name);
        product.id = this.id++;
        this.productsListFromDatabase.push(product);
        await this._notify();
        return product;
    }

    readList(search){
        console.log("Reading "+search);
        if(search == null || search.length === 0)
            return this.productsListFromDatabase;
        search = search.toLowerCase();
        return this.productsListFromDatabase.filter((p) => p.name.toLowerCase().includes(search) || p.price.toString().includes(search));
    }

    async delete(id){
        console.log("Removing "+id);
        const product = this.productsListFromDatabase.find((product) => product.id == id);
        this.productsListFromDatabase.splice(this.productsListFromDatabase.indexOf(product),1);
        await this._notify();
        return product;
    }

    async _notify(){
        console.log("Notifying clients that server has "+this.productsListFromDatabase.length+" products");
        route.listAllProductsRoute.notifyClients({
            output: this.productsListFromDatabase,
        });
    }
}


const productsRepository = new ProductsRepository();

module.exports = productsRepository;
