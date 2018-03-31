const Sequelize = require('sequelize');
const {log, biglog, errorlog, colorize} = require("./out");
const {models}= require('./model');
const quizzes = require('./quizzes');
const readline = require('readline');
/**
 * Muestra la ayuda
 *
 * @param rl Objeto readline usando para implementar el CLI
 */
exports.helpCmd = (socket,rl) => {
    log(socket,"Commandos:");
    log(socket,"  h|help - Muestra esta ayuda.");
    log(socket,"  list - Listar los quizzes existentes.");
    log(socket,"  show <id> - Muestra la pregunta y la respuesta del quiz indicado..");
    log(socket,"  add - Añadir un nuevo quiz interactivamente");
    log(socket,"  delete<id>  Borrar el quiz indicado.");
    log(socket,"  edit<id> - Editar el quiz indicado.");
    log(socket,"  test<id> - Test del quiz indicado.");
    log(socket,"  p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
    log(socket,"  credits - Créditos.");
    log(socket,"  q|quit - Salir del programa.");
    rl.prompt();
};

/**
 * Lista todos los quizzes existentes en el modelo.
 * @param rl Objeto readline usando para implementar el CLI
 */
exports.listCmd = (socket,rl) => {
    models.quiz.findAll()
        .then(quizzes => {
            quizzes.forEach(quiz => {
                log(socket,` [${colorize(quiz.id, 'magenta')}]:  ${quiz.question}`);
            });
        })
        .catch(error => {
            errorlog(socket,error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

/**
 * Esta funcion devuelve una promesa que:
 *   - Valida que se ha introducido un valor para el parametro.
 *   - Convierte el parametro en un numero entero.
 *
 * @param id Parametro con el indice a validar.
 */

const validateId = (id,socket) => {
    return new Sequelize.Promise((resolve, reject) => {
        if (typeof id === "undefined"){
            errorlog(socket,`Falta el parametro <id>.`);
            reject(new Error(`Falta el parametro <id>.`));
        } else {
            id = parseInt(id); //coger la parte entera y descartar lo demas
            if (Number.isNaN(id)) {
                errorlog(socket,`El valor del parámetro <id> no es un número`);
                reject(new Error(`El valor del parámetro <id> no es un número`));
            }else{
                resolve(id);
            }
        }
    });
};
/**
 * Muestra el quiz indicado en el parametro: la pregunta y la respuesta
 *
 * @param rl Objeto readline usando para implementar el CLI
 * @param id Clave del quiz a mostrar
 */
exports.showCmd = (socket,rl, id) => {
    validateId(id,socket)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if (!quiz) {
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }
            log(socket,` [${colorize(quiz.id, 'magenta')}]:   ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(error => {
            errorlog(socket,error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

/**
 * Esta funcion convierte la llamada rl.question, que está basada en callbacks, en una
 * basada en promesas.
 *
 * Esta función devuelve una promesa cuando se cumple, proporciona el texto introducido.
 * Entonces la llamada a then que hay que hacer la promesa será:
 *    .then(answer => {...})
 *
 * También colorea en rojo el texto de la pregunta, elimina espacios al principio y f
 * @param rl Objeto readline usado para implementar el CLI.
 * @param text Pregunta que hay que hacerle al usuario.
 */

const makeQuestion = (rl, text) => {

    return new Sequelize.Promise((resolve, reject) => {
        rl.question(colorize(text, 'red'), answer => {
            resolve(answer.trim());
        });
    });
};
/**
 * Añade un nuevo quiz al modelo.
 * Pregunta interactivamente por la pregunta y la respuesta.
 *
 * Hay que recordar que el funcionamiento de la función rl.question es asincrono.
 * El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
 * es decir, la llamada rl.prompt() se debe hacer en la callback de la segunda
 * llamada a rl.question.
 *
 * @param rl Objeto readline usando para implementar el CLI
 */
exports.addCmd = (socket,rl) => {
    makeQuestion(rl, ' Introduzca una pregunta: ')
        .then(q => {
            return makeQuestion(rl, ' Introduzca la respuesta ')
                .then(a => {
                    return {question: q, answer: a};
                });
        })
        .then(quiz => {
            return models.quiz.create(quiz);
        })
        .then((quiz) => {
            log(socket,` ${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog(socket,'El quiz es erroneo:');
            error.errors.forEach(({message}) => errorlog(socket,message));
        })
        .catch(error => {
            errorlog(socket,error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

/**
 * Borra un quiz del modelo.
 *
 * @param rl Objeto readline usando para implementar el CLI
 * @param id Clave del quiz a borrar en el modelo.
 */
exports.deleteCmd = (socket,rl,id) => {
    validateId(id,socket)
        .then(id => models.quiz.destroy({where: {id}}))
        .catch(error => {
            errorlog(socket,error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

/**
 * Edita un quiz del modelo.
 *
 * Hay que redcordar que el funcionamiento de la funcion rl.question es asíncrono.
 * El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
 * es decir, la llamada a rl.prompt() se debe hacer en la callback de la segunda
 * llamada a rl.question.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a editar en el modelo.
 */
exports.editCmd = (socket,rl, id) => {
    validateId(id,socket)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if (!quiz) {
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }

            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
            return makeQuestion(rl, 'Introduzca la respuesta: ')
                .then(q => {
                    process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
                    return makeQuestion(rl, 'Introduzca la respuesta ')
                        .then(a => {
                            quiz.question = q;
                            quiz.answer = a;
                            return quiz;
                        });
                });
        })
        .then(quiz =>{
            return quiz.save();
        })
        .then(quiz =>{
            log(socket,`Se ha cambiado el quiz ${colorize(quiz.id,'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog(socket,'El quiz es erroneo: ');
            error.errors.forEach(({message}) => errorlog(socket,message));
        })
        .catch(error => {
            errorlog(socket,error.message);
        })
        .then(() => {
            rl.prompt();
        });
};


/**
/ * Muestra los nombre de los autores de la practica.
 *
 * @param rl Objeto readline usando para implementar el CLI
 */
exports.creditsCmd = (socket,rl) => {
    log(socket,'Autor de la practica:');
    log(socket,'Luis Francisco del Cerro', 'green');
    rl.prompt();
};


/**
 * Terminar el programa.
 *
 * @param rl Objeto readline usando para implementar el CLI
 */
exports.quitCmd = (socket,rl) => {
    rl.close();
    socket.end();

};

/**
 * Prueba un quiz, es decir, hace una pregunta del modelo a la que debemos de contestar.
 *
 * @param rl Objeto readline usando para implementar el CLI
 * @param id clave del quiz a probar.
 */

exports.testCmd = (socket,rl,id) => {
    validateId(id,socket)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if (!quiz) {
                errorlog(socket,`No existe un quiz asociado al id=${id}.`);
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }
             return makeQuestion(rl, quiz.question)
                .then(answer => {

                    respuesta = answer.toLowerCase().trim();
                    solución = quiz.answer.toLowerCase();
                    if (respuesta === solución) {
                        log(socket, 'Su respuesta es correcta', 'green');
                    }
                    else {
                        log(socket, 'Su respuesta es incorrecta', 'red');
                    }
                })
        .catch(Sequelize.ValidationError, error => {
            errorlog(socket,'El quiz es erroneo: ');
            error.errors.forEach(({message}) => errorlog(socket,message));

        })
        .catch(error => {
            errorlog(socket,error.message);

        })
        .then(() => {
            rl.prompt();

        });



        })

}
exports.playCmd= (socket,rl) => {
    let score = 0;
    models.quiz.count()
        .then(restantes =>{
    models.quiz.findAll()
        .then(quizzes=> {
            const playOne = () => {
                if (restantes === 0) {
                    log(socket,'No hay nada más que preguntar', 'magenta');
                    log(socket,'Fin del examen.Aciertos:' + score);
                    rl.prompt();
                }
                else {

                    let id_azar = Math.floor(Math.random() * restantes);
                    let quiz = quizzes[id_azar];
                    quizzes.splice(id_azar, 1);
                    restantes--;
                    return makeQuestion(rl, quiz.question)
                        .then(answer => {
                            respuesta = answer.toLowerCase().trim();
                            solución = quiz.answer.toLowerCase();
                            if (respuesta === solución) {
                                score++;
                                log(socket,"CORRECTO - Lleva " + score + " aciertos");
                                playOne();
                            }
                            else {
                                log(socket,'INCORRECTO');
                                log(socket,'Fin del examen. Aciertos: ' +score);
                                rl.prompt();
                            }
                        })


                }
            }

            playOne();
        })
        })
};



