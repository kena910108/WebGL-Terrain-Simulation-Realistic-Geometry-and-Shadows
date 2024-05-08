import { Mat4, Vec3, Vec4 } from "../TSM.js";
import Rand from "../rand-seed/Rand.js";
export class Floor {
    constructor(height, whole, text_w, max_height, max_dis) {
        this.floorY = -2;
        this.beta = 0;
        this.whole_width = 90.0;
        this.texture_width = 45.0; // actually 10.0
        this.disps = [];
        this.vertex_normals = [];
        this.max_height = 20.0;
        this.max_dis = 6.0;
        this.odd_pos = [];
        this.floorY = height;
        this.whole_width = whole;
        this.texture_width = text_w;
        this.max_dis = max_dis;
        this.max_height = max_height;
        /* Set default position. */
        this.vertices = [
            new Vec4([0.0, this.floorY, 0.0, 1]),
            new Vec4([this.whole_width / 2.0, this.floorY, this.whole_width / 2.0, 1]),
            new Vec4([-this.whole_width / 2.0, this.floorY, this.whole_width / 2.0, 1]),
            new Vec4([-this.whole_width / 2.0, this.floorY, -this.whole_width / 2.0, 1]),
            new Vec4([this.whole_width / 2.0, this.floorY, -this.whole_width / 2.0, 1])
        ];
        /* Flatten Position. */
        this.verticesF32 = new Float32Array(this.vertices.length * 4);
        this.vertices.forEach((v, i) => { this.verticesF32.set(v.xyzw, i * 4); });
        /* Set indices. */
        this.ind = [
            new Vec3([0, 2, 1]),
            new Vec3([0, 3, 2]),
            new Vec3([0, 4, 3]),
            new Vec3([0, 1, 4])
        ];
        /* Flatten Indices. */
        this.indicesU32 = new Uint32Array(this.ind.length * 3);
        this.ind.forEach((v, i) => { this.indicesU32.set(v.xyz, i * 3); });
        /* Set Normals. */
        this.norms = [
            new Vec4([0.0, 1.0, 0.0, 0.0]),
            new Vec4([0.0, 1.0, 0.0, 0.0]),
            new Vec4([0.0, 1.0, 0.0, 0.0]),
            new Vec4([0.0, 1.0, 0.0, 0.0])
        ];
        this.normalsF32 = new Float32Array(this.norms.length * 4);
        this.norms.forEach((v, i) => { this.normalsF32.set(v.xyzw, i * 4); });
    }
    positions() {
        return this.vertices;
    }
    positionsFlat() {
        return this.verticesF32;
    }
    colors() {
        throw new Error("Floor::colors() incomplete method");
        return [];
    }
    getTextureWidth() {
        return this.texture_width;
    }
    getWholeWidth() {
        return this.whole_width;
    }
    colorsFlat() {
        throw new Error("Floor::colorsFlat() incomplete method");
        return new Float32Array([]);
    }
    setColors(colors) {
        throw new Error("Floor::setColors() incomplete method");
    }
    indices() {
        return this.ind;
    }
    indicesFlat() {
        return this.indicesU32;
    }
    uMatrix() {
        throw new Error("Floor::uMatrix() incomplete method");
        return new Mat4();
    }
    scale(s) {
        throw new Error("Floor::scale() incomplete method");
    }
    translate(p) {
        throw new Error("Floor::translate() incomplete method");
    }
    normals() {
        return this.norms;
    }
    get_vertex_normals() {
        let vertex_normalsF32 = new Float32Array(this.vertex_normals.length * 4);
        this.vertex_normals.forEach((v, i) => { vertex_normalsF32.set(v.xyz, i * 3); });
        return vertex_normalsF32;
    }
    normalsFlat() {
        return this.normalsF32;
    }
    displacements(height_map) {
        for (let i = 0; i < this.vertices.length; i++) {
            let u = this.vertices[i].x % (2 * this.texture_width);
            let v = this.vertices[i].z % (2 * this.texture_width);
            if (u < 0) {
                u += 2 * this.texture_width;
            }
            if (v < 0) {
                v += 2 * this.texture_width;
            }
            u /= 2 * this.texture_width;
            v /= 2 * this.texture_width;
            let pixel_x = Math.floor(u * 4094);
            let pixel_y = Math.floor(v * 4094);
            let index = pixel_x + 4096 * pixel_y;
            this.disps.push(height_map[index] * 1.0 / 255.0);
        }
    }
    flatten() {
        for (let i = 0; i < this.vertices.length; i++) {
            this.vertex_normals.push(new Vec3([0, 0, 0]));
        }
        /* Flatten Position. */
        this.verticesF32 = new Float32Array(this.vertices.length * 4);
        this.vertices.forEach((v, i) => { this.verticesF32.set(v.xyzw, i * 4); });
        /* Flatten Indices. */
        this.indicesU32 = new Uint32Array(this.ind.length * 3);
        this.ind.forEach((v, i) => { this.indicesU32.set(v.xyz, i * 3); });
        this.norms = [];
        for (let i = 0; i < this.ind.length; i++) {
            this.norms.push(new Vec4([0.0, 1.0, 0.0, 0.0]));
        }
        this.normalsF32 = new Float32Array(this.norms.length * 4);
        this.norms.forEach((v, i) => { this.normalsF32.set(v.xyzw, i * 4); });
    }
    GenerateCopies(row, height_map) {
        // odd by odd
        this.displacements(height_map);
        let new_vertices = this.vertices.slice();
        let new_ind = this.ind.slice();
        let interval = 2 * this.texture_width;
        for (let x_offset = -row * interval; x_offset <= row * interval; x_offset += interval) {
            for (let z_offset = -row * interval; z_offset <= row * interval; z_offset += interval) {
                if (x_offset === 0 && z_offset === 0) {
                    continue;
                }
                let pre_vertices = this.vertices.length + new_vertices.length;
                for (let i = 0; i < this.ind.length; i++) {
                    new_ind.push(new Vec3([this.ind[i].x + pre_vertices, this.ind[i].y + pre_vertices, this.ind[i].z + pre_vertices]));
                }
                for (let i = 0; i < this.vertices.length; i++) {
                    new_vertices.push(new Vec4([this.vertices[i].x + x_offset, this.vertices[i].y, this.vertices[i].z + z_offset, 1]));
                }
            }
        }
        this.vertices = this.vertices.concat(new_vertices);
        this.ind = this.ind.concat(new_ind);
        this.flatten();
    }
    GenerateVertexNormals() {
        for (let i = 0; i < this.ind.length; i++) {
            let vec1 = new Vec4();
            let vec2 = new Vec4();
            this.vertices[this.ind[i].y].subtract(this.vertices[this.ind[i].x], vec1);
            this.vertices[this.ind[i].x].subtract(this.vertices[this.ind[i].z], vec2);
            let normal = Vec3.cross(new Vec3(vec2.xyz), new Vec3(vec1.xyz)).normalize();
            this.vertex_normals[this.ind[i].x] = normal;
            this.vertex_normals[this.ind[i].y] = normal;
            this.vertex_normals[this.ind[i].z] = normal;
        }
    }
    apply_value_noise() {
        let terrain_length = this.whole_width;
        let number_layer_cubes = 4;
        let scale = 1;
        for (let layer = 0; layer < 3; layer++) { //4 (1), 16 (1/2), 64 (1/8)
            // generate sample
            let layer_height;
            //find new seed
            let num = 64.0 + layer;
            let rng = new Rand(num.toString());
            // generate noise for each chuck
            layer_height = new Array(number_layer_cubes);
            for (let i = 0; i < number_layer_cubes; i++) {
                layer_height[i] = new Array(number_layer_cubes).fill(0);
                for (let j = 0; j < number_layer_cubes; j++) {
                    layer_height[i][j] = Math.floor(this.max_height * rng.next());
                }
            }
            // upsampling
            for (let i = 0; i < this.vertices.length; i++) {
                let u = (this.vertices[i].x + this.whole_width / 2.0) / ((terrain_length + 0.1) / (number_layer_cubes - 1));
                let v = (this.vertices[i].z + this.whole_width / 2.0) / ((terrain_length + 0.1) / (number_layer_cubes - 1));
                let top_left_i = Math.floor(u);
                let top_left_j = Math.floor(v);
                u = u - top_left_i;
                v = v - top_left_j;
                let samples = [0, 0, 0, 0];
                for (let ii = 0; ii < 2; ii++) {
                    for (let jj = 0; jj < 2; jj++) {
                        samples[ii + jj * 2] = layer_height[top_left_i + ii][top_left_j + jj];
                    }
                }
                const height = (1 - v) * ((1 - u) * samples[0] +
                    u * samples[1]) +
                    v * ((1 - u) * samples[2] +
                        u * samples[3]);
                this.vertices[i] = new Vec4([this.vertices[i].x, this.vertices[i].y + height * scale, this.vertices[i].z, 1]);
            }
            number_layer_cubes *= 2;
            scale /= 2;
        }
        /* Flatten Position. */
        this.verticesF32 = new Float32Array(this.vertices.length * 4);
        this.vertices.forEach((v, i) => { this.verticesF32.set(v.xyzw, i * 4); });
    }
    apply_displacement(height_map) {
        this.GenerateVertexNormals();
        this.displacements(height_map);
        for (let i = 0; i < this.vertices.length; i++) {
            let normal = new Vec3(this.vertex_normals[i].xyz);
            let offset = normal.scale(this.disps[i] * this.max_dis);
            this.vertices[i] = new Vec4([this.vertices[i].x + offset.x, this.vertices[i].y + offset.y, this.vertices[i].z + offset.z, 1]);
        }
        //console.log(this.vertices.slice(-10));
        this.verticesF32 = new Float32Array(this.vertices.length * 4);
        this.vertices.forEach((v, i) => { this.verticesF32.set(v.xyzw, i * 4); });
    }
    subdivision(beta) {
        this.beta = beta;
        this.phase_3_triangle_seperation();
        console.log(this.ind.length);
        /* Flatten Position. */
        for (let i = 0; i < this.vertices.length; i++) {
            this.vertices[i] = new Vec4([this.vertices[i].x, this.vertices[i].y, this.vertices[i].z, 1]);
        }
        this.GenerateVertexNormals();
        this.flatten();
    }
    phase_1_find_opposite() {
        // e2
        // |  \
        // |    v2
        // |  /
        // e1
        // edge_oppsite_map[e1][e2] = v2
        let edge_oppsite_map = new Map();
        this.ind.forEach((triangle) => {
            for (let i = 0; i < 3; i++) {
                edge_oppsite_map.set(`${triangle.xyz[i]}_${triangle.xyz[(i + 1) % 3]}`, triangle.xyz[(i + 2) % 3]);
            }
        });
        return edge_oppsite_map;
    }
    phase_2_calculate_position(triangle, i, edge_oppsite_map) {
        var _a, _b, _c, _d, _e;
        let e1 = triangle.xyz[i];
        let e2 = triangle.xyz[(i + 1) % 3];
        // Not calcuated before
        let pos_e1 = (_a = this.vertices[e1]) !== null && _a !== void 0 ? _a : new Vec4([0.0, 0.0, 0.0, 0.0]);
        let pos_e2 = (_b = this.vertices[e2]) !== null && _b !== void 0 ? _b : new Vec4([0.0, 0.0, 0.0, 0.0]);
        let pos_v2 = (_c = this.vertices[triangle.xyz[(i + 2) % 3]]) !== null && _c !== void 0 ? _c : new Vec4([0.0, 0.0, 0.0, 0.0]);
        let pos_odd = new Vec4([0.0, 0.0, 0.0, 0.0]);
        if (edge_oppsite_map.has(`${e2}_${e1}`)) {
            let v1 = (_d = edge_oppsite_map.get(`${e2}_${e1}`)) !== null && _d !== void 0 ? _d : -1;
            let pos_v1 = (_e = this.vertices[v1]) !== null && _e !== void 0 ? _e : new Vec4([0.0, 0.0, 0.0, 0.0]);
            pos_odd = Vec4.sum(Vec4.sum(pos_e1, pos_e2).scale(3.0 / 8.0), Vec4.sum(pos_v1, pos_v2).scale(1.0 / 8.0));
        }
        else {
            pos_odd = Vec4.sum(pos_e1, pos_e2).scale(1.0 / 2.0);
        }
        this.odd_pos.push(pos_odd);
    }
    phase_2_odd_vertices_generation() {
        // use edge_oppsite_map to calculate the odd vertices positions
        // An edge has only one odd vertex regardless the direction
        // edge_oppsite_map[e1][e2] = v2
        let edge_oppsite_map = this.phase_1_find_opposite();
        let edge_index_map = new Map(); // map of odd vertex on an edge to its index. edge_index_map["e1_e2"] = index
        // calcualte the position 
        this.ind.forEach((triangle) => {
            for (let i = 0; i < 3; i++) {
                let e1 = triangle.xyz[i];
                let e2 = triangle.xyz[(i + 1) % 3];
                // check if repeated
                if (edge_index_map.has(`${e2}_${e1}`)) {
                    let odd_ind = edge_index_map.get(`${e2}_${e1}`);
                    edge_index_map.set(`${e1}_${e2}`, odd_ind);
                    continue;
                }
                this.phase_2_calculate_position(triangle, i, edge_oppsite_map);
                edge_index_map.set(`${e1}_${e2}`, this.vertices.length + this.odd_pos.length - 1);
            }
        });
        return edge_index_map;
    }
    phase_3_triangle_seperation() {
        // for each triangle, find the three odd vertices and reorgazie the triangles
        let edge_index_map = this.phase_2_odd_vertices_generation();
        let new_ind = [];
        this.ind.forEach((triangle) => {
            let v1 = triangle.xyz[0];
            let v2 = triangle.xyz[1];
            let v3 = triangle.xyz[2];
            let e1 = edge_index_map.get(`${v1}_${v2}`);
            let e2 = edge_index_map.get(`${v2}_${v3}`);
            let e3 = edge_index_map.get(`${v3}_${v1}`);
            new_ind.push(new Vec3([e1, e2, e3]));
            new_ind.push(new Vec3([e1, v2, e2]));
            new_ind.push(new Vec3([e2, v3, e3]));
            new_ind.push(new Vec3([e3, v1, e1]));
        });
        this.phase_4_adjust_even_vertices(edge_index_map);
        // replace old vertices and triangle array
        this.ind = new_ind;
        this.vertices = this.vertices.concat(this.odd_pos);
        //free memory
        this.odd_pos = [];
        new_ind = [];
    }
    check_boudary(vertex) {
        if (vertex.x == -this.whole_width / 2.0 || vertex.x == this.whole_width / 2.0 ||
            vertex.z == -this.whole_width / 2.0 || vertex.z == this.whole_width / 2.0) {
            return true;
        }
        return false;
    }
    phase_4_adjust_even_vertices(edge_index_map) {
        // iterate thorugh all OLD triangel list, if the edge deosn't have the oppsite then it is boundary
        // Else, add beta * pos_odd to the it pos, i.e, v + sum (pos_odd - v)*beta
        let even_position = this.vertices.slice();
        this.ind.forEach((triangle) => {
            var _a, _b, _c;
            let v1 = triangle.xyz[0];
            let v2 = triangle.xyz[1];
            let v3 = triangle.xyz[2];
            /* let e1:number = edge_index_map.get(`${v1}_${v2}`)! - this.vertices.length;
            let e2:number = edge_index_map.get(`${v2}_${v3}`)! - this.vertices.length;
            let e3:number = edge_index_map.get(`${v3}_${v1}`)! - this.vertices.length; */
            /* even_position[v2].add(Vec4.difference(this.vertices[v1],this.vertices[v2]).scale(this.beta)??new Vec4([0.0,0.0,0.0,0.0]));
            even_position[v3].add(Vec4.difference(this.vertices[v2],this.vertices[v3]).scale(this.beta)??new Vec4([0.0,0.0,0.0,0.0]));
            even_position[v1].add(Vec4.difference(this.vertices[v3],this.vertices[v1]).scale(this.beta)??new Vec4([0.0,0.0,0.0,0.0])); */
            if (!this.check_boudary(this.vertices[v2])) {
                even_position[v2].add((_a = Vec4.difference(this.vertices[v1], this.vertices[v2]).scale(this.beta)) !== null && _a !== void 0 ? _a : new Vec4([0.0, 0.0, 0.0, 0.0]));
            }
            if (!this.check_boudary(this.vertices[v3])) {
                even_position[v3].add((_b = Vec4.difference(this.vertices[v2], this.vertices[v3]).scale(this.beta)) !== null && _b !== void 0 ? _b : new Vec4([0.0, 0.0, 0.0, 0.0]));
            }
            if (!this.check_boudary(this.vertices[v1])) {
                even_position[v1].add((_c = Vec4.difference(this.vertices[v3], this.vertices[v1]).scale(this.beta)) !== null && _c !== void 0 ? _c : new Vec4([0.0, 0.0, 0.0, 0.0]));
            }
        });
        this.vertices = even_position;
    }
}
//# sourceMappingURL=Floor.js.map