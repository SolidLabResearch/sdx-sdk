import { GraphQLObjectType, GraphQLType, GraphQLFloat, GraphQLInt, GraphQLString } from "graphql";
import { DataFactory, NamedNode, Quad, Store } from "n3";
import { Context } from "../context.js";
import { utils, vocab } from "../../commons";
const { namedNode } = DataFactory;

export class PropertyShape {
    public name: string;
    public description?: string;
    public type?: GraphQLType;
    public path?: string;
    public minCount?: number;
    public maxCount?: number;
    private className?: string;

    constructor(public quads: Quad[], private context: Context) {
        const store = new Store(quads);
        this.name = this.parseObject(store, vocab.SHACL.name) ?? utils.parseNameFromUri(this.parseObject(store,vocab.SHACL.path)!);
        this.description = this.parseObject(store, vocab.SHACL.description);
        this.type = this.parseType(store);
        this.path = this.parseObject(store, vocab.SHACL.path);
        const minCount = this.parseObject(store, vocab.SHACL.minCount);
        this.minCount = minCount ? parseInt(minCount) : undefined;
        const maxCount = this.parseObject(store, vocab.SHACL.maxCount);
        this.maxCount = maxCount ? parseInt(maxCount) : undefined;
        this.className = this.parseClass(store);
    }

    private parseObject(store: Store, predicate: NamedNode, throwError = false): string | undefined {
        const obj = store.getObjects(null, predicate, null);
        if (obj && obj.length === 1) {
            return obj.at(0)!.value;
        } else if (throwError) {
            throw new Error(`Could not find a ${predicate.id} for PropertyShape.`)
        } else {
            return undefined;
        }
    }

    private parseType(store: Store): GraphQLType | undefined {
        const type = this.parseObject(store, vocab.SHACL.datatype);
        return this.dataTypeToGraphQLType(type);
    }

    private parseClass(store: Store): string | undefined {
        const clazz = this.parseObject(store, vocab.SHACL.class);
        return this.findMatchingShapeType(clazz);
    }

    private dataTypeToGraphQLType(datatype?: string): GraphQLType | undefined {
        switch (datatype) {
            case vocab.XSD.int.value:
                return GraphQLInt;

            case vocab.XSD.float.value:
                return GraphQLFloat;

            case vocab.RDFS.langString.value:
            case vocab.XSD.string.value:
                return GraphQLString;

            case vocab.XSD.boolean.value:
                return GraphQLFloat;

            default:
                return undefined;
        }
    }

    private findMatchingShapeType(clazz?: string): string | undefined {
        if (!clazz) { return undefined; }
        const match = this.context.getStore().getQuads(null, vocab.SHACL.targetClass, namedNode(clazz), null);
        if (match && match.length === 1) {
            return utils.parseNameFromUri(match.at(0)!.subject.value);
        }
        return undefined;
    }

    public get class(): () => GraphQLObjectType | undefined {
        return () => {
            const type = this.context.getGraphQLObjectTypes().find(type => type.name === this.className);
            if (type) {
                // console.log(`found existing Shape for prop ${this.name}: + ${type.name}`)
            } else {
                console.log(`No Shape found for property ${this.name} ==> IGNORE`)
            }
            return type;
        }
    }
}
